jQuery.noConflict();

jQuery(function($){
	'use strict'
	var projects = {},
		issues = {},
		objects = {
			project: projects,
			issue: issues
		},
		names = {
			project: 'name',
			issue: 'subject'
		},
		plural = {
			project: 'projects',
			issue: 'issues'
		}

	function load_and_draw_branch(type, id, base) {
		//var objects = (type == 'project') ? projects : issues
		var object = objects[type][id]
		var switcher = base.children('.switcher')
		var type_plural = plural[type]
		if (object.loaded || id === null) {
			draw_branch(type, id, base)
			return
		}
		var url = 'relationship/' + type_plural + '/' + id + '/children'
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
		base.append(draw_branch_part(type, 'issue', id, base))
		base.data('drawn', true)
		base.children('ul').slideToggle()
		base.children('.switcher').toggleClass('open')
	}

	function draw_branch_part(parent_type, node_type, id, base) {
		var name = names[node_type]
		var node_type_plural = plural[node_type]
		var branch = $('<ul class="' + node_type_plural + '">')
		var _switcher = $('<div class="switcher">')
		branch.css('display', 'none')
		objects[parent_type][id][node_type_plural].each(function(el) {
			var object = el[node_type]
			var switcher = _switcher.clone()
			var leaf = $('<li>' + object[name] + '</li>')
				.data('id', object.id)
				.data('type', node_type)
				.prepend(switcher)
			if (!el.has_content) {
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
			id = base.data('id')
		if ($(this).hasClass('loading')) return
		if (!(id in objects[type])) {
			objects[type][id] = {
				projects: [],
				issues: [],
				loaded: false
			}
		}
		var object = objects[type][id]
		if (!object.loaded || !base.data('drawn')) {
			load_and_draw_branch(type, id, base)
			return
		}			
		base.children('ul').stop(true).slideToggle()
		$(this).toggleClass('open')
	}

	$.get('/relationship/projects', function(data){
		load_object(data, projects)
		load_and_draw_branch('project', null, $('.column .tree'))
	})

	function load_object(src, dst) {
		for (let i in src) dst[i] = src[i]
	}
})