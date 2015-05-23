jQuery.noConflict();

jQuery(function($){
	$.get('/relationship/projects', function(data){
		function draw_tree(data, parent) {
			var tree = $('<ul>')
			data[parent] && data[parent].each(function(el){
				var branch = $('<li data-id="' + el.id + '">' + el.name + '</li>')
				branch.append(draw_tree(data, el.id))
				tree.append(branch)
			})
			return tree
		}
		$('.column .tree').append(draw_tree(data, null))
	})
})