jQuery.noConflict();

jQuery(function($){

	'use strict'

	var projects = {},
		issues = {},
		params = {
			project: init_params(projects, 'name', 'projects', ['open']),
			issue: init_params(issues, 'subject', 'issues', 
						['open', 'related', 'parent-project', 'parent-issue']),
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
		control_buttons_handlers = {
			open: control_button_handler_open,
			related: control_button_handler_related,
			parent_project: control_button_handler_parent_project,
			parent_issue: control_button_handler_parent_issue,
		}

	function init_params(objects, name, plural, control_buttons) {
		return {
			objects: objects,
			name: name,
			plural: plural,
			control_buttons: control_buttons,
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
		var name = params[node_type].name,
			node_type_plural = params[node_type].plural,
			branch = $('<ul class="' + node_type_plural + '">'),
			_switcher = $('<div class="switcher">'),
			object, switcher, leaf

		branch.css('display', 'none')
		params[parent_type].objects[id][node_type_plural].each(function(el) {
			switcher = _switcher.clone()
			leaf = $('<li><div class="title">' + el[name] + '<div></li>')
				.data('id', el.id)
				.data('type', node_type)
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
	})


	/*
	 *	Selection processing
	 */

	function select_handler() {
		var column = $(this).closest('.column'),
			side = column.data('side')
		selected[side].type = $(this).data('type')
		selected[side].id = $(this).data('id')
		column.find('.selected').removeClass('selected')
		$(this).addClass('selected')
		control_buttons_switch(side, 
							   params[$(this).data('type')].control_buttons)
		return false
	}

	function li_dblclick_handler() {
		open_url($(this).data('type'), $(this).data('id'))
		return false
	}

	function control_buttons_switch(column, enabled_buttons) {
		var buttons = $('.column.' + column + ' .control-button')
		buttons.each(function() {
			$(this).addClass('disabled')
			if (enabled_buttons.indexOf($(this).data('type')) >= 0) {
				$(this).removeClass('disabled')
			}
		})
	}

	$('.column')
		.on('click', 'li', select_handler)
		.on('dblclick', 'li', li_dblclick_handler)


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

	}

	function control_button_handler_parent_project(column) {

	}

	function control_button_handler_parent_issue(column) {

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

})