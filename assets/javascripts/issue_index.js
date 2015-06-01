window.onload = function() {

	var el = document.createElement('th')

	$$('.list.issues thead tr')[0].insertBefore(el, $$('.list.issues th')[7])
	$$('.list.issues tbody tr').each(function(tr) {
		var a = document.createElement('a')
		a.href = '/relationship#' + tr.id.split('-')[1]
		a.target = '_blank'
		a.innerHTML = '<i class="fa fa-link"></i>'
		tr.insertBefore(a, tr.children[7])
	})

}