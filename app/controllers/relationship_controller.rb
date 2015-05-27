class RelationshipController < ApplicationController
  unloadable


  def index
  end

  def projects
  	@projects = Project.all(conditions: {status: 1})
    result = {}
  	#render json: @projects.reduce({}) {|a,v| a.merge({(v.parent_id!=nil) ? v.parent_id : 'null' => [v]}){|_, old, new| old+new}}
    @projects.each do | project |
      key = (project.parent_id!=nil) ? project.parent_id : 'null'
      if result.has_key?(key)
        result[key][:projects] << {
          project: project,
          has_content: project_has_content(project.id)
        }
      else
        result[key] = {
          projects: [{
            project: project,
            has_content: project_has_content(project.id)
          }],
          issues: [],
          loaded: false
        }
      end
    end
    render json: result
  end

  def projects_children
  	@issues = Issue.all(conditions: {project_id: params[:id]})
  	result = @issues.map do | issue | {
        issue: issue,
        has_content: issue_has_content(issue.id)
      }
    end
    render json: result
  end

  def issues_children
  	@issues = Issue.all(conditions: {parent_id: params[:id]})
    result = @issues.map do | issue | {
        issue: issue,
        has_content: issue_has_content(issue.id)
      }
    end
    render json: result
  end

private
  def project_has_content(id)
    has_content = Project.all(conditions: {parent_id: id}).count > 0
    has_content ||= Issue.all(conditions: {project_id: id}).count > 0
  end
  def issue_has_content(id)
    Issue.all(conditions: {parent_id: id}).count > 0
  end
end
