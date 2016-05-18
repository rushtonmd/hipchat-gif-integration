JiraServerLogic = {

	teamBoardIDs: [{
		name: 'Aether',
		id: 3,
	}, {
		name: 'Alchemists',
		id: 19
	}, {
		name: 'Chronos',
		id: 2
	}, {
		name: 'Daedelus',
		id: 4
	}, {
		name: 'Kobayashi',
		id: 7
	}, {
		name: 'Vulcan',
		id: 27
	}, {
		name: 'Devron',
		id: 39
	}, {
		name: 'Pricing Engine',
		id: 61
	}, {
		name: 'Site Modeling',
		id: 78
	}
	],

	createSession: function() {
		var auth_url = "https://sungevity.atlassian.net/rest/auth/latest/session";

		var result = Meteor.http.call("POST", auth_url, {
			data: {
				'username': Credentials.jira.username,
				'password': Credentials.jira.password,
			},
			headers: {
				"content-type": "application/json",
				"Accept": "application/json",
			},
		});

		var cookie_value = result['headers']['set-cookie'];

		for (var c in cookie_value) {
			if (cookie_value[c].indexOf("Expires") !== -1) {
				cookie_value[c] = "";
			}
		}

		return {
			statusCode: result.statusCode,
			cookie_value: cookie_value
		};
	},

	getAllSprintReports: function() {

		var sessionResult = JiraServerLogic.createSession();

		if (sessionResult.statusCode !== 200) return;

		var results = {};
		results.teams = [];
		results.totals = {};
		results.totals.storiesDone = 0;
		results.totals.storiesNotDone = 0;
		results.totals.storiesBrickouts = 0;
		results.totals.storiesBrickins = 0;
		results.totals.storiesCommitment = 0;
		results.totals.storiesCommitmentDone = 0;
		results.totals.storiesBrickinsDone = 0;


		// Loop through all the teams in the list
		_.each(JiraServerLogic.teamBoardIDs, function(teamID) {

			var team = {};

			team.name = teamID.name;

			team.id = teamID.id;

			var latestSprintID = JiraServerLogic.getLatestSprint(teamID.id, sessionResult);

			if (latestSprintID){

				team.latestSprint = JiraServerLogic.getSprintReport(teamID.id, latestSprintID, sessionResult);

				results.totals.storiesDone += team.latestSprint.issuesDone.stories;
				results.totals.storiesNotDone += team.latestSprint.issuesNotDone.stories;
				results.totals.storiesBrickouts += team.latestSprint.brickouts.stories;
				results.totals.storiesBrickins += team.latestSprint.brickins.stories;
				results.totals.storiesCommitment += team.latestSprint.commitment.stories;
				results.totals.storiesCommitmentDone += team.latestSprint.originalCommittedDone.stories;
				results.totals.storiesBrickinsDone += team.latestSprint.brickinsDone.stories;

				results.teams.push(team);
			}

		});

		return results;

	},

	getLatestSprint: function(teamID, sessionResult){

		var latestSprintUrl = "https://sungevity.atlassian.net/rest/greenhopper/latest/sprintquery/" + teamID;

		var latestSprintUrlResult = Meteor.http.call("GET", latestSprintUrl, {
			params: {
				timeout: 30000
			},
			headers: {
				"cookie": sessionResult.cookie_value,
				"content-type": "application/json",
				"Accept": "application/json"
			},
		});

		var latestSprints = JSON.parse(latestSprintUrlResult.content).sprints.reverse();

		if (latestSprints.length <= 0) return undefined;

		var latestSprint = _.find(latestSprints, function(sprint) {
			return sprint.state === 'CLOSED';
		});

		latestSprint = latestSprint || {};

		return latestSprint.id;

	},

	getTeamSprintHistory: function(teamID){

		var sessionResult = JiraServerLogic.createSession();

		if (sessionResult.statusCode !== 200) return;

		var results = [];

		var latestSprintUrl = "https://sungevity.atlassian.net/rest/greenhopper/latest/sprintquery/" + teamID;

		var latestSprintUrlResult = Meteor.http.call("GET", latestSprintUrl, {
			params: {
				timeout: 30000
			},
			headers: {
				"cookie": sessionResult.cookie_value,
				"content-type": "application/json",
				"Accept": "application/json"
			},
		});

		var latestSprints = JSON.parse(latestSprintUrlResult.content).sprints.reverse();

		_.each(latestSprints, function(sprint) {
			results.push(JiraServerLogic.getSprintReport(teamID, sprint.id, sessionResult));
		});

		return results;

	},

	getSprintReport: function(teamID, latestSprintID, sessionResult) {

		if (!teamID || !latestSprintID) return {};


		var auth_url = "https://sungevity.atlassian.net/rest/greenhopper/1.0/rapid/charts/sprintreport?rapidViewId=" + teamID + "&sprintId=" + latestSprintID;
		var result = Meteor.http.call("GET", auth_url, {
			params: {
				timeout: 30000
			},
			headers: {
				"cookie": sessionResult.cookie_value,
				"content-type": "application/json",
				"Accept": "application/json"
			},
		});

		var sprintReportRes = JSON.parse(result.content);
		var sprintReportResults = sprintReportRes.contents;
		var sprintReportDetails = sprintReportRes.sprint;


		var sprintReportSummary = {};
		sprintReportSummary.sprintDetails = {
			name: sprintReportDetails.name,
			startDate: sprintReportDetails.startDate,
			endDate: sprintReportDetails.endDate
		};

		sprintReportSummary.issuesDone = {};
		sprintReportSummary.issuesDone.stories = sprintReportResults.completedIssues.length;
		sprintReportSummary.issuesDone.storypoints = sprintReportResults.completedIssuesInitialEstimateSum.value || 0;


		sprintReportSummary.issuesNotDone = {};
		sprintReportSummary.issuesNotDone.stories = sprintReportResults.issuesNotCompletedInCurrentSprint.length;
		sprintReportSummary.issuesNotDone.storypoints = sprintReportResults.issuesNotCompletedEstimateSum.value || 0;


		sprintReportSummary.brickouts = {};
		sprintReportSummary.brickouts.stories = sprintReportResults.puntedIssues.length;
		sprintReportSummary.brickouts.storypoints = sprintReportResults.puntedIssuesEstimateSum.value || 0;


		// Need to sum up the points of the issues in issueKeysAddedDuringSprint
		var allIssues = _.union(sprintReportResults.completedIssues, sprintReportResults.issuesNotCompletedInCurrentSprint, sprintReportResults.puntedIssues);
		var brickinList = _.keys(sprintReportResults.issueKeysAddedDuringSprint);

		var brickins = _.filter(allIssues, function(issue) {
			return _.indexOf(brickinList, issue.key) >= 0;
		});
		var brickinsSum = _.reduce(brickins, function(memo, issue) {
			if (issue && issue.estimateStatistic && issue.estimateStatistic.statFieldValue && issue.estimateStatistic.statFieldValue){
				return memo + (issue.estimateStatistic.statFieldValue.value || 0);
			}
			return memo;

		}, 0);

		sprintReportSummary.brickins = {};
		sprintReportSummary.brickins.stories = brickins.length;
		sprintReportSummary.brickins.storypoints = brickinsSum;

		sprintReportSummary.commitment = {};
		sprintReportSummary.commitment.stories =
			sprintReportSummary.issuesDone.stories +
			sprintReportSummary.issuesNotDone.stories +
			sprintReportSummary.brickouts.stories -
			sprintReportSummary.brickins.stories;
		sprintReportSummary.commitment.storypoints =
			sprintReportSummary.issuesDone.storypoints +
			sprintReportSummary.issuesNotDone.storypoints +
			sprintReportSummary.brickouts.storypoints -
			sprintReportSummary.brickins.storypoints;


		// CompletedIssues not in Brickins list
		var originalCommittedDone = _.filter(sprintReportResults.completedIssues, function(issue) {
			return _.indexOf(brickinList, issue.key) === -1;
		});

		var originalCommittedDoneSum = _.reduce(originalCommittedDone, function(memo, issue) {
			if (issue && issue.estimateStatistic && issue.estimateStatistic.statFieldValue && issue.estimateStatistic.statFieldValue){
				return memo + (issue.estimateStatistic.statFieldValue.value || 0);				
			}
			return 0;

		}, 0);

		sprintReportSummary.originalCommittedDone = {};
		sprintReportSummary.originalCommittedDone.stories = originalCommittedDone.length;
		sprintReportSummary.originalCommittedDone.storypoints = originalCommittedDoneSum;

		sprintReportSummary.brickinsDone = {};
		sprintReportSummary.brickinsDone.stories = sprintReportSummary.issuesDone.stories - sprintReportSummary.originalCommittedDone.stories;
		sprintReportSummary.brickinsDone.storypoints = sprintReportSummary.issuesDone.storypoints - sprintReportSummary.originalCommittedDone.storypoints;

		return sprintReportSummary;

	}

}
