require 'redmine'

require_dependency 'relationship/hooks'

Redmine::Plugin.register :redmine_relationship do
  name 'Redmine Relationship plugin'
  author 'gwer'
  description 'This is a plugin for Redmine'
  version '0.0.1'
  url 'http://example.com/path/to/plugin'
  author_url 'http://example.com/about'
end
