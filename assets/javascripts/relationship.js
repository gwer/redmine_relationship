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
			initial: ['related_by_number'],
			project: ['open', 'related_by_number'],
			issue: ['open', 'related', 'parent_project', 'parent_issue', 
					'related_by_number'],
			related_issues: ['return', 'related_by_number'],
			related_issues_selected: ['open', 'related', 'parent_project', 
									  'parent_issue', 'return', 'deselect',
									  'related_by_number'],
			all: ['open', 'related', 'parent_project', 'parent_issue', 'return',
				  'deselect', 'related_by_number']
		},
		control_buttons_handlers = {
			open: control_button_handler_open,
			related: control_button_handler_related,
			parent_project: control_button_handler_parent_project,
			parent_issue: control_button_handler_parent_issue,
			return: control_button_handler_return,
			deselect: control_button_handler_deselect,
			related_by_number: control_button_handler_related_by_number,
		}

	function init_params(objects, name, plural) {
		return {
			objects: objects,
			name: name,
			plural: plural,
		}
	}


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

	$.get('/relationship/projects', function(data){
		load_object(data, projects)
		load_and_draw_branch('project', null, $('.column .tree'))
		control_buttons_enable_only('column', control_buttons.initial)
	})


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
			control_buttons_enable_only(side, 
								   control_buttons.related_issues_selected)
			control_buttons_enable_only(other_side(side), 
								   control_buttons.related_issues)
		} else {			
			control_buttons_enable_only(side, control_buttons[li.data('type')])
		}
		return false
	}

	function li_dblclick_handler() {
		open_url($(this).data('type'), $(this).data('id'))
		return false
	}

	$('.column')
		.on('click', 'li', select_handler)
		.on('dblclick', 'li', li_dblclick_handler)


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
		control_buttons_enable_only('left', control_buttons.related_issues) 
		control_buttons_enable_only('right', control_buttons.related_issues) 
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

	function control_button_handler_open(column) {
		open_url(selected[column].type, selected[column].id)
	}

	function control_button_handler_related(column) {
		load_and_draw_related_issues(selected[column].id)
	}

	function control_button_handler_parent_project(column) {
		alert('Не в этот раз.')
	}

	function control_button_handler_parent_issue(column) {
		alert('Не в этот раз.')
	}

	function control_button_handler_return(column) {
		$('.selected').removeClass('selected')
		$('.tree').slideDown()
		$('.related_issues').slideUp()
		control_buttons_enable_only('column', control_buttons.initial)
	}

	function control_button_handler_deselect(column) {		
		$('.selected').removeClass('selected')
		control_buttons_enable_only('column', control_buttons.related_issues)
		$('.related_issues li').each(function(){$(this).slideDown()})
	}

	function control_button_handler_related_by_number(column) {		
		var id = prompt("Номер задачи:");		
		load_and_draw_related_issues(id)
	}

	$('.control-button').click(control_buttons_handler)


	/*
	 *	Helpers
	 */

	function load_object(src, dst) {
		for (let i in src) dst[i] = src[i]
	}

	function open_url(type, id) {
		var url = '/' + params[type].plural + '/' + id
		window.open(url);
	}

	function draw_leaf(el, type) {
		var name = params[type].name,
			leaf, assigned_to, status
		leaf = $('<li><div class="title">' + el[name] + '</div></li>')
			.data('id', el.id)
			.data('type', type)
		if (type === 'issue') {
			assigned_to = el.firstname + ' ' + el.lastname
			status = el.status_name
			leaf.append('<td class="assigned">' + assigned_to + '</td>')
				.append('<td class="status">' + status + '</td>')
		}
		leaf.find('.title').wrapAll('<td>')				
		leaf.find('td').wrapAll('<table class="wrapper">')
					   .wrapAll('<tr>')
		return leaf
	}

	function other_side(side) {
		return side === 'left' ? 'right' : 'left'
	}

	function control_buttons_enable_only(column, buttons) {
		control_buttons_enable(column, 'all')
		control_buttons_disable(column, buttons)
	}

	function control_buttons_enable(column, buttons) {
		var dom_buttons = $('.column.' + column + ' .control-button')

		dom_buttons.each(function() {
			$(this).addClass('disabled')
		})
	}

	function control_buttons_disable(column, buttons) {
		var dom_buttons = $('.column.' + column + ' .control-button')

		dom_buttons.each(function() {
			if (buttons.indexOf($(this).data('type')) >= 0) {
				$(this).removeClass('disabled')
			}
		})
	}

})