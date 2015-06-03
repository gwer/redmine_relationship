class RelationshipController < ApplicationController
  unloadable


  def index
    @users = User.all conditions: {status: 1}
  end

  def projects
  	@projects = Project.all(
              conditions: {status: 1}, 
              select: 'projects.id, projects.name, 
                                     projects.parent_id,
                                     (projects.rgt - projects.lft - 1 + 
                                      COUNT(issues.id)) AS has_content, 
                                     COUNT(t1.id) AS has_opened_content',
              joins: 'LEFT JOIN issues ON issues.project_id = projects.id
                      LEFT JOIN issue_statuses AS t1 ON t1.id = issues.status_id 
                                                        AND NOT t1.is_closed', 
              group: 'projects.id',
              order: 'projects.id'
    )
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
  	@issues = (Issue.all({conditions: {project_id: params[:id], 
                                      parent_id: nil, 
                                      projects: {status: 1}}}.merge(
                                                    issue_select_params)) +
               Issue.all({conditions: {project_id: params[:id], 
                                      projects: {status: 1}}}.merge(
                                                    issue_select_params))).uniq
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

  def user_api_key
    render inline: User.current.api_key
  end

private

  def issue_select_params
    return {
      select: 'issues.id, issues.parent_id, issues.project_id, issues.subject, 
               issues.status_id, issues.updated_on, 
               users.firstname AS firstname, users.id AS user_id, 
               users.lastname AS lastname, issue_statuses.name AS status_name, 
               issue_statuses.is_closed, 
               (issues.rgt-issues.lft-1) as has_content, 
               COUNT(t1.id) AS has_opened_content', 
      joins: 'LEFT JOIN users ON issues.assigned_to_id = users.id
              LEFT JOIN issue_statuses ON issues.status_id = issue_statuses.id
              LEFT JOIN projects ON issues.project_id = projects.id
              LEFT JOIN issues AS t ON issues.id = t.parent_id
              LEFT JOIN issue_statuses AS t1 ON t1.id = t.status_id 
                                                AND NOT t1.is_closed',
      group: 'issues.id, user_id, status_name, issue_statuses.is_closed',
      order: 'issues.id DESC'
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
