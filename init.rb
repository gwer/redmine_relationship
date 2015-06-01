require 'redmine'

require_dependency 'relationship/hooks'

Redmine::Plugin.register :redmine_relationship do
  name 'Issues Relationship plugin'
  author 'gwer'
  version '0.1'
  url '/relationship'
  menu :top_menu, :relationship, { :controller => 'relationship', :action => 'index' }, :caption => :relationship_caption
end
