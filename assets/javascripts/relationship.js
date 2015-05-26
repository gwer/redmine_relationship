jQuery.noConflict();

jQuery(function($){

	var projects = {},
		issues = {}

	function draw_branch(type, id, base) {
		var branch = $('<ul>')
		var _switcher = $('<div class="switcher">')
		load_content(type, id)
		base.children('ul').remove()
		if (id !== null) branch.css('display', 'none')
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
		base.data('ready', true)
	}

	function switch_handler() {
		var base = $(this).closest('li')
		if (!base.data('ready')) {
			draw_branch(base.data('type'), base.data('id'), base)
		}
		$(this).toggleClass('open')
		base.children('ul').slideToggle()
	}

	function load_content(type, id) {
		var url = (type == 'project') ? 
					'relationship/projects/' + id + '/children' :
					'relationship/issues/' + id + '/children'
		var objects = (type == 'project') ? projects : issues
		$.get(url, function(data){
			objects[id].issues = data
			console.log(data)
		})
	}

	$.get('/relationship/projects', function(data){
		projects = data
		draw_branch('project', null, $('.column .tree'))
	})
})