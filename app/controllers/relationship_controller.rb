class RelationshipController < ApplicationController
  unloadable


  def index
  end

  def projects
  	@projects = Project.all(conditions: {status: 1}, 
                            select: 'projects.id, projects.name, 
                                     projects.parent_id,
                                     (projects.rgt - projects.lft - 1 + 
                                      COUNT(issues.id)) AS has_content',
                            joins: 'LEFT JOIN "issues" ON issues.project_id = projects.id', 
                            group: 'projects.id',
                            order: 'projects.id')
    result = {}
    @projects.each do | project |
      key = (project.parent_id!=nil) ? project.parent_id : 'null'
      if result.has_key?(key)
        result[key][:projects] << project
      else
        result[key] = {
          projects: [project],
          issues: [],
          loaded: false
        }
      end
    end
    render json: result
  end

  def projects_children
  	@issues = Issue.all(conditions: {project_id: params[:id]},
                        select: 'issues.id, parent_id, project_id, subject, 
                                 status_id, users.firstname AS firstname, 
                                 users.lastname AS lastname, 
                                 issue_statuses.name AS status_name,
                                 (rgt-lft-1) as has_content', 
                        joins: [:author, :status])
    render json: @issues
  end

  def issues_children
  	@issues = Issue.all(conditions: {parent_id: params[:id]},
                        select: 'issues.id, parent_id, project_id, subject, 
                                 status_id, users.firstname AS firstname, 
                                 users.lastname AS lastname, 
                                 issue_statuses.name AS status_name,
                                 (rgt-lft-1) as has_content', 
                        joins: [:author, :status])
    render json: @issues
  end

private

  def get_relative_issues(issue)
    issues = issue.relations.map do | relation |

    end
  end

end
