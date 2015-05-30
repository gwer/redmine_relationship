jQuery.noConflict();

jQuery(function($){

	'use strict'

	var projects = {},
		issues = {},
		relations = {},
		params = {
			project: init_params(projects, 'name', 'projects'),
			issue: init_params(issues, 'subject', 'issues'),
		},
		selected = {
			left: {
				type: '',
				id: ''
			},
			right: {
				type: '',
				id: ''
			}
		},
		control_buttons = {
			initial: {
				self: [],
				general: ['related_by_number', 'show_closed'],
				other: false,
			},
			project: {
				self: ['open'],
				general: ['related_by_number', 'show_closed'],
				other: false,
			},
			issue: {
				self: ['open', 'related', 'parent_project', 'parent_issue'],
				general: ['related_by_number', 'show_closed'],
				other: false,
			},
			related_issues: {
				self: [],
				general: ['related_by_number', 'show_closed', 'return'],
				other: [],
			},
			related_issues_selected: {
				self: ['open', 'related', 'parent_project', 'parent_issue'],
				general: ['related_by_number', 'show_closed', 'return', 
						  'deselect'],
				other: [],
			},
			all: {
				self: ['open', 'related', 'parent_project', 'parent_issue'],
				general: ['related_by_number', 'show_closed', 'return', 
						  'deselect'],
				other: ['open', 'related', 'parent_project', 'parent_issue']
			},
		},
		control_buttons_handlers = {},
		general_control_buttons_handlers = {},
		state = {
			closed: 'unlock',
		}

	function init_params(objects, name, plural) {
		return {
			objects: objects,
			name: name,
			plural: plural,
		}
	}

	(function init() {
		$.get('/relationship/projects', function(data){
			load_object(data, projects)
			load_and_draw_branch('project', null, $('.column .tree'))
			control_buttons_enable_only('column', 'initial')
		})

		$('.column')
			.on('click', 'li', select_handler)
			.on('dblclick', 'li', li_dblclick_handler)

		$('.control-button').click(control_buttons_handler)
		$('.general-control-button').click(general_control_buttons_handler)
	})()


	/*
	 *	Loading and drawing projects-issues tree
	 */

	function load_and_draw_branch(type, id, base) {
		var object = params[type].objects[id],
			switcher = base.children('.switcher'),
			type_plural = params[type].plural,
			url = 'relationship/' + type_plural + '/' + id + '/children'

		if (object.loaded || id === null) {
			draw_branch(type, id, base)
			return
		}

		switcher.toggleClass('loading hidden')
		$.get(url, function(data){
			object.issues = data
			object.loaded = true
			draw_branch(type, id, base)
			switcher.toggleClass('loading hidden')
		})
	}

	function draw_branch(type, id, base) {
		base.children('ul').remove()
		base.append(draw_branch_part(type, 'project', id, base))
		base.append('<ul class="separator" style="display: none;">')
		base.append(draw_branch_part(type, 'issue', id, base))
		base.data('drawn', true)
		base.children('ul').slideToggle()
		base.toggleClass('open')
	}

	function draw_branch_part(parent_type, node_type, id, base) {
		var node_type_plural = params[node_type].plural,
			branch = $('<ul class="' + node_type_plural + '">'),
			_switcher = $('<div class="switcher">'),
			object, switcher, leaf

		branch.css('display', 'none')
		params[parent_type].objects[id][node_type_plural].each(function(el) {
			switcher = _switcher.clone()
			leaf = draw_leaf(el, node_type)
					.prepend(switcher)
			if (!parseInt(el.has_content)) {
				switcher.addClass('hidden')
			} 
			switcher.click(switch_handler)
			branch.append(leaf)
		})
		return branch
	}

	function switch_handler() {
		var base = $(this).closest('li'),
			type = base.data('type'),
			id = base.data('id'),
			object

		if ($(this).hasClass('loading') || $(this).hasClass('hidden')) return

		if (!(id in params[type].objects)) {
			params[type].objects[id] = {
				projects: [],
				issues: [],
				loaded: false
			}
		}
		object = params[type].objects[id]
		if (!object.loaded || !base.data('drawn')) {
			load_and_draw_branch(type, id, base)
			return false // hereinafter to prevent bubbling
		}			

		base.children('ul').stop(true).slideToggle()
		base.toggleClass('open')
		return false
	}


	/*
	 *	Selection processing
	 */

	function select_handler() {
		var li = $(this),
			column = li.closest('.column'),
			side = column.data('side'),
			other_column = $('.column.' + other_side(side)),
			is_tree = !!li.closest('.tree').length

		selected[side].type = li.data('type')
		selected[side].id = li.data('id')
		column.find('.selected').removeClass('selected')
		li.addClass('selected')
		if (!is_tree) {
			other_column.find('.selected').removeClass('selected')
			other_column.find('.related_issues li').each(function() {
				if(relations[li.data('id')].indexOf($(this).data('id')) < 0) {
					$(this).slideUp()
				} else {
					$(this).slideDown()
				}
			})
			control_buttons_enable_only(other_side(side), 
								'related_issues')
			control_buttons_enable_only(side, 
								'related_issues_selected')
		} else {			
			control_buttons_enable_only(side, li.data('type'))
		}
		return false
	}

	function li_dblclick_handler() {
		open_url($(this).data('type'), $(this).data('id'))
		return false
	}


	/*
	 *	Loading and drawing related issues
	 */

	function load_and_draw_related_issues(id) {
		var url = 'relationship/issues/' + id + '/relative',
			left = $('.column.left .related_issues'),
			right = $('.column.right .related_issues'),
			main_ul = $('<ul class="main">'), 
			_related_ul = $('<ul class="related">'),
			related_ul

		left.find('ul').remove()
		right.find('ul').remove()
		control_buttons_enable_only('column', 'related_issues') 
		$('.tree').slideUp()
		$('.related_issues').slideDown()
		$('#ajax-indicator').show()
		$.ajax({
			url: url, 
			success: function(data) {
				relations = data.relations
				main_ul.append(draw_leaf(data.main, 'issue'))
				left.append(main_ul)
				related_ul = _related_ul.clone()
				data.second.each(function(el) {
					related_ul.append(draw_leaf(el, 'issue'))
				})
				left.append(related_ul)
				related_ul = _related_ul.clone()
				data.first.each(function(el) {
					related_ul.append(draw_leaf(el, 'issue'))
				})
				right.append(related_ul)
				$('#ajax-indicator').hide()		
			},
			error: function() {
				main_ul.append('Не удалось загрузить задачу с номером ' + id)
				left.append(main_ul)
				$('#ajax-indicator').hide()	
			}
		})
	}

	/*
	 *	Control buttons processing
	 */

	function control_buttons_handler() {
		var column = $(this).closest('.column').data('side') 

		if ($(this).hasClass('disabled')) return

		control_buttons_handlers[$(this).data('type')](column)
	}

	function general_control_buttons_handler() {
		if ($(this).hasClass('disabled')) return

		general_control_buttons_handlers[$(this).data('type')]()
	}

	control_buttons_handlers.open = function(column) {
		open_url(selected[column].type, selected[column].id)
	}

	control_buttons_handlers.related = function(column) {
		load_and_draw_related_issues(selected[column].id)
	}

	control_buttons_handlers.parent_project = function(column) {
		alert('Не в этот раз.')
	}

	control_buttons_handlers.parent_issue = function(column) {
		alert('Не в этот раз.')
	}

	general_control_buttons_handlers.return = function() {
		$('.selected').removeClass('selected')
		$('.tree').slideDown()
		$('.related_issues').slideUp()
		control_buttons_enable_only('column', 'initial')
	}

	general_control_buttons_handlers.deselect = function() {		
		$('.selected').removeClass('selected')
		control_buttons_enable_only('column', 'related_issues')
		$('.related_issues li').each(function(){$(this).slideDown()})
	}

	general_control_buttons_handlers.related_by_number = function() {		
		var id = prompt("Номер задачи:");		
		load_and_draw_related_issues(id)
	}

	general_control_buttons_handlers.show_closed = function() {	
		alert('Не в этот раз.')
	}


	/*
	 *	Helpers
	 */

	function load_object(src, dst) {
		for (var i in src) dst[i] = src[i]
	}

	function open_url(type, id) {
		var url = '/' + params[type].plural + '/' + id
		window.open(url);
	}

	function draw_leaf(el, type) {
		var name = params[type].name,
			leaf, assigned_to, status
		leaf = $('<li><table class="wrapper"><tr><td class="title">' + 
				 el[name] + '</td></tr></table></li>')
			.data('id', el.id)
			.data('type', type)
		if (type === 'issue') {
			assigned_to = el.firstname + ' ' + el.lastname
			status = el.status_name
			leaf.find('tr')
				.append('<td class="assigned">' + assigned_to + '</td>')
				.append('<td class="status">' + status + '</td>')
		}		
		return leaf
	}

	function other_side(side) {
		return side === 'left' ? 'right' : 'left'
	}

	function control_buttons_enable_only(column, buttons_type) {
		_control_buttons_enable_only(column, buttons_type, 'self')
		if (column === 'general') return

		_control_buttons_enable_only('general', buttons_type, 'general')
		if (column === 'column') return

		_control_buttons_enable_only(other_side(column), buttons_type, 'other')
	}

	function _control_buttons_enable_only(column, buttons_type, src) {
		var buttons = control_buttons[buttons_type][src]

		if (buttons) {
			control_buttons_disable(column, control_buttons.all[src])	
			control_buttons_enable(column, buttons)		
		}
	}

	function control_buttons_switch(enable, column, buttons) {
		var dom_buttons = (column === 'general') ? 
			$('.general-control-button') : 
			$('.column.' + column + ' .control-button')

		dom_buttons.each(function() {
			if (buttons.indexOf($(this).data('type')) >= 0) {
				if (enable) {
					$(this).removeClass('disabled')
				} else {
					$(this).addClass('disabled')
				}
			}
		})
	}

	function control_buttons_enable(column, buttons) {
		control_buttons_switch(true, column, buttons)
	}

	function control_buttons_disable(column, buttons) {
		control_buttons_switch(false, column, buttons)
	}

})