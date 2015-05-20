module Interaction
  class Hooks < Redmine::Hook::ViewListener
    render_on :view_layouts_base_html_head, :partial => 'hooks/js'
  end
end