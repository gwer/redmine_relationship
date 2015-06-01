window.onload = function() {
	var id = window.location.pathname.split('/').pop(),
		block = $$('#content .contextual')[0],
		a = document.createElement('a')

	a.href = '/relationship#' + id
	a.innerHTML = '<i class="fa fa-link"></i> Показать связи &nbsp;'
	block.insertBefore(a, block.children[0])
}