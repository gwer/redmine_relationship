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
  	@issues = Issue.all({conditions: {project_id: params[:id], 
                                      projects: {status: 1}}}.merge(
                                                          issue_select_params))
    render json: @issues
  end

  def issues_children
  	@issues = Issue.all({conditions: {parent_id: params[:id], 
                                      projects: {status: 1}}}.merge(
                                                          issue_select_params))
    render json: @issues
  end

  def issues_relative
    @main_issue = Issue.find(params[:id], {conditions: 
                                            {projects: {status: 1}}}.merge(
                                                          issue_select_params))
    @first_issues = get_relative_issues(@main_issue)
    @second_issues = get_relative_issues(@first_issues) - [@main_issue]
    relations = {}
    (@first_issues + @second_issues + [@main_issue]).uniq.each do | issue |
      relations[issue.id] = get_relative_issues(issue).map{|el| el.id}
    end

    render json: {
      main: @main_issue,
      first: @first_issues,
      second: @second_issues,
      relations: relations
    }
  end

private

  def issue_select_params
    return {
      select: 'issues.id, issues.parent_id, project_id, subject, status_id, 
               users.firstname AS firstname, users.lastname AS lastname, 
               issue_statuses.name AS status_name, 
               (issues.rgt-issues.lft-1) as has_content', 
      joins: [:assigned_to, :status, :project]
    }
  end

  def get_relative_issues(issues)
    @relations = IssueRelation.all(conditions: {issue_from_id: issues},
                                   select: 'issue_to_id')
                 .map{|el| el.issue_to_id} +
                 IssueRelation.all(conditions: {issue_to_id: issues},
                                   select: 'issue_from_id')
                 .map{|el| el.issue_from_id}
    return Issue.all({conditions: {issues: {id: @relations}, 
                                   projects: {status: 1}}}.merge(
                                                          issue_select_params))
  end

end
