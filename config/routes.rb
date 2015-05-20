#match 'interaction/(:action(/:id))', :controller => 'interaction'
#get "interaction", :to => "interaction#index"
ActionController::Routing::Routes.draw do |map|
	map.connect('interaction',  :controller => 'interaction', :action => 'index',
		:conditions => {:method => :get})
end