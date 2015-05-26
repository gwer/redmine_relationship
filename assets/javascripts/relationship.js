jQuery.noConflict();

jQuery(function($){

	var projects = {},
		issues = {},
		objects = {
			project: projects,
			issue: issues
		}

	function load_and_draw_branch(type, id, base) {
		//var objects = (type == 'project') ? projects : issues
		var object = objects[type][id]
		var switcher = base.children('.switcher')
		if (object.loaded || id === null) {
			draw_branch(type, id, base)
			return
		}
		var url = 'relationship/' + type + 's/' + id + '/children'
		switcher.toggleClass('loading hidden')
		$.get(url, function(data){
			object.issues = data
			// Issues loaded means that branch is also drawn
			object.loaded = true
			draw_branch(type, id, base)
			switcher.toggleClass('loading hidden')
		})
	}

	function draw_branch(type, id, base) {
		var branch = $('<ul>')
		var _switcher = $('<div class="switcher">')
		base.children('ul').remove()
		branch.css('display', 'none')
		projects[id] && projects[id].projects.each(function(el){
			var project = el.project
			var switcher = _switcher.clone()
			var leaf = $('<li>' + project.name + '</li>')
				.data('id', project.id)
				.data('type', 'project')
				.prepend(switcher)
			if (!el.has_content) {
				switcher.addClass('hidden')
			} 
			switcher.click(switch_handler)
			branch.append(leaf)
		})
		base.append(branch)
		base.data('drawn', true)
		base.children('ul').slideToggle()
		base.children('.switcher').toggleClass('open')
	}

	function switch_handler() {
		var base = $(this).closest('li'),
			type = base.data('type'),
			id = base.data('id')
		if ($(this).hasClass('loading')) return
		if (!(id in objects[type])) {
			objects[type][id] = {
				projects: [],
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

	/*function load_content(type, id) {
		var url = (type == 'project') ? 
					'relationship/projects/' + id + '/children' :
					'relationship/issues/' + id + '/children'
		var objects = (type == 'project') ? projects : issues
		$.get(url, function(data){
			objects[id].issues = data
			console.log(data)
		})
	}*/

	$.get('/relationship/projects', function(data){
		load_object(data, projects)
		load_and_draw_branch('project', null, $('.column .tree'))
	})

	function load_object(src, dst) {
		for (i in src) dst[i] = src[i]
	}
})