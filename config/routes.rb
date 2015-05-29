ActionController::Routing::Routes.draw do |map|
	map.connect('relationship',  :controller => 'relationship', :action => 'index',
		:conditions => {:method => :get})
	map.connect('relationship/projects',  :controller => 'relationship', :action => 'projects',
		:conditions => {:method => :get})
	map.connect('relationship/projects/:id/children',  :controller => 'relationship', :action => 'projects_children',
		:conditions => {:method => :get})
	map.connect('relationship/issues/:id/children',  :controller => 'relationship', :action => 'issues_children',
		:conditions => {:method => :get})
	map.connect('relationship/issues/:id/relative',  :controller => 'relationship', :action => 'issues_relative',
		:conditions => {:method => :get})
end