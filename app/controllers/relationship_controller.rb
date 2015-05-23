class RelationshipController < ApplicationController
  unloadable


  def index
  end

  def projects
  	@projects = Project.all
  	render json: @projects.reduce({}) {|a,v| a.merge({(v.parent_id!=nil) ? v.parent_id : 'null' => [v]}){|_, old, new| old+new}}
  end

  def projects_children
  	@issues = Issue.all(conditions: {project_id: params[:id]})
  	render json: @issues
  end

  def issues_children
  	@issues = Issue.all(conditions: {parent_id: params[:id]})
  	render json: @issues
  end
end
