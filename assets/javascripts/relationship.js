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
			api_key: '',
		}

	function init_params(objects, name, plural) {
		return {
			objects: objects,
			name: name,
			plural: plural,
		}
	}

	(function init() {
		$.get('/relationship/projects', function(data) {
			load_object(data, projects)
			load_and_draw_branch('project', null, $('.column .tree'))
			control_buttons_enable_only('column', 'initial')
		})

		$.get('/relationship/api_key', function(data) {
			state.api_key = data
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
			switcher = base.children('.switcher')

		if (object.loaded || id === null) {
			draw_branch(type, id, base)
			return
		}

		switcher.toggleClass('loading hidden')
		load_branch(type, id, function() {
			draw_branch(type, id, base)
			switcher.toggleClass('loading hidden')			
		})
	}

	function load_branch(type, id, callback) {
		var object = params[type].objects[id],
			type_plural = params[type].plural,
			url = 'relationship/' + type_plural + '/' + id + '/children'
			
		$.get(url, function(data){
			object.issues = data
			object.loaded = true
			if (callback) callback()
		})
	}

	function draw_branch(type, id, base) {
		base.children('ul').remove()
		base.append(draw_branch_part(type, 'project', id, base))
		base.append('<ul class="separator" style="display: none;">')
		base.append(draw_branch_part(type, 'issue', id, base))
		base.attr('data-drawn', true)
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
			column.find('li').slideDown()
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
		var changed_id = selected[column].id,
			changed_li = $('.' + column).find(li_selector('issue', changed_id)),
			parent_li = changed_li.parent().closest('li')[0],
			parent_ds = parent_li.dataset,
			parent_id = (parent_ds.type === 'issue') ? parent_ds.id : 'root',
			msg = 'Номер родительского тикета (root — чтобы сделать корневым):',
			new_parent = prompt(msg, parent_id),
			csrf_meta_tag = $('meta[name=csrf-token]')[0],
			token = ''

		if (!new_parent || new_parent === parent_id) return

		if (new_parent === 'root') new_parent = null

		if (csrf_meta_tag) {
			token = csrf_meta_tag.content
		}

		$.ajax({
			url: '/issues/' + changed_id + '.json',
			dataType: 'text',
			contentType: 'application/json',
			data: JSON.stringify({
				issue: {
					parent_issue_id: new_parent
				},
				key: state.api_key,
			}),
			type: 'PUT',
			headers: {'X-CSRF-Token': token},
			success: success_handler,
			error: function(data) {
				alert(JSON.parse(data.responseText).errors.join('\n'))
			}
		})

		function success_handler(data) {
			var project = changed_li.closest('li[data-type=project]')[0],
				lis, ds

			lis = $(li_selector(parent_ds.type, parent_ds.id))
			ds = lis[0].dataset
			load_branch(parent_ds.type, parent_ds.id, function() {
				lis.each(function(_, el) {
					ds = el.dataset
			  		if (ds.drawn) {
						load_and_draw_branch(ds.type, ds.id, $(el))
					}
				})

				if (new_parent === null) {
					ds = project.dataset
					lis = $(li_selector(ds.type, ds.id))
				} else {
					lis = $(li_selector('issue', new_parent))
					if (!params.issue.objects[new_parent]) return

					ds = (!!lis.length) ? lis[0].dataset : {
						type: 'issue', 
						id: new_parent
					} 
				}

				load_branch(ds.type, ds.id, function() {
					lis.each(function(_, el) {
						ds = el.dataset
				  		if (ds.drawn) {
							load_and_draw_branch(ds.type, ds.id, $(el))
						}
					})
				})
			})
		}

		function li_selector(type, id) {
			return 'li[data-type=' + type + '][data-id=' + id + ']'
		}
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
		var id = prompt("Номер задачи:")		
		load_and_draw_related_issues(id)
	}

	general_control_buttons_handlers.show_closed = function() {	
		if (state.closed === 'unlock') {
			state.closed = 'lock'
			$('[data-type=show_closed] .fa').removeClass('fa-unlock')
											.addClass('fa-lock')
			$('.column').addClass('hide_closed')
			
			return
		}
		state.closed = 'unlock'		
		$('[data-type=show_closed] .fa').addClass('fa-unlock')
										.removeClass('fa-lock')
		$('.column').removeClass('hide_closed')
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
			.attr('data-id', el.id)
			.attr('data-type', type)
		if (!parseInt(el.has_opened_content)) {
			leaf.addClass('has_no_opened_content')
		}	
		if (type === 'issue') {
			assigned_to = el.firstname + ' ' + el.lastname
			status = el.status_name
			leaf.find('tr')
				.append('<td class="assigned">' + assigned_to + '</td>')
				.append('<td class="status">' + status + '</td>')
				.find('.title').prepend('#' + el.id + ': ')
			if (el.is_closed === 't') {
				leaf.addClass('closed')
			}
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