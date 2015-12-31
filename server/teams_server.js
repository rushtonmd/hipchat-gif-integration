
Meteor.publish('teamList', function() {
	var self = this;
	try {

		var sessionResult = JiraServerLogic.createSession();

		if (sessionResult.statusCode !== 200) return;

		var searchUrl = 'https://sungevity.atlassian.net/rest/api/2/project';

		var response = Meteor.http.call("GET", searchUrl, {
			params: {
				timeout: 30000
			},
			headers: {
				"cookie": sessionResult.cookie_value,
				"content-type": "application/json",
				"Accept": "application/json"
			},
		});

		//_.each(response.data, function(item) {
		_.each(JiraServerLogic.teamBoardIDs, function(item) {
			//console.log(item);
			var doc = {
				id: item.id,
				name: item.name
			};

			self.added('teams', Random.id(), doc);

		});

		console.log("TEAM LIST!");
		self.ready();

	} catch (error) {
		console.log(error);
	}
});


Meteor.publish('teamDataSearch', function(team) {
	console.log("Team ID: " + team);

	var self = this;
	try {

		var teamResults = JiraServerLogic.getTeamSprintHistory(team);

		_.each(teamResults, function(sprint) {
			console.log(sprint);
			var doc = {
				data: sprint
			};

			self.added('teamStatistics', Random.id(), sprint);

		});

		console.log("TEAM DETAILS!");
		self.ready();

	} catch (error) {
		console.log(error);
	}
});

Meteor.publish('labelSearch', function(query) {
	console.log("Search: " + query);
	var self = this;
	try {

		//var x = JiraServerLogic.getAllSprintReports();
		//console.log(x);
		var sessionResult = JiraServerLogic.createSession();

		//console.log("Sesson Result: " + sessionResult.cookie_value);

		if (sessionResult.statusCode !== 200) return;

		var labelSearchUrl = 'https://sungevity.atlassian.net/rest/api/2/search?jql=labels%20in%20(' + query.trim() +')&maxResults=200&fields=summary,created,issuetype,status,customfield_10005&expand=changelog';


		var response = Meteor.http.call("GET", labelSearchUrl, {
			params: {
				timeout: 30000
			},
			headers: {
				"cookie": sessionResult.cookie_value,
				"content-type": "application/json",
				"Accept": "application/json"
			},
		});


		var allIssues = response.data.issues;
		// allIssues = _.groupBy(allIssues, function(issue){
		// 	return moment(issue.fields.created).format("YYYY MMM DD");
		// //	return issue.customfield_10005;
		// });


		// _.each(allIssues, function(item, key) {
		// 	console.log(item);
		// 	var p =  _.reduce(item, function(memo, i){ return memo + (parseInt(i.fields.customfield_10005) || 0); }, 0);
		// 	var doc = {
		// 		date: key,
		// 		totalPoints: p
		// 	};

		// 	self.added('issues', Random.id(), doc);

		// });

		allIssues = _.filter(allIssues, function(issue){
			return issue.fields.issuetype.name === "Story" || issue.fields.issuetype.name === "Technical Story";
		});

		allIssues = _.sortBy(allIssues, function(issue){
			return issue.fields.created;
		});

		_.each(allIssues, function(item, key) {

			var doneDate = null;

			if (item.fields.status.statusCategory.name === "Done") {

				// Let's try a reduce of the history
				doneDate = _.reduce(item.changelog.histories, function(memo, i){
					var d = new Date(i.created);
					if(_.reduce(i.items, function(memo, j){
						if (j.field === "status" && j.toString === "Done") return memo || true;
						return memo || false;
					}, false)) {
						if (d > memo) return d;
					};

					return memo;

				}, null);
			};

			var doc = {
				key: item.key,
				storyPoints: item.fields.customfield_10005,
				created: item.fields.created,
				status: item.fields.status.statusCategory.name,
				type: item.fields.issuetype,
				doneDate: doneDate
			};
			
			self.added('issues', Random.id(), doc);

		});

		console.log("READY!");
		self.ready();

	} catch (error) {
		console.log(error);
	}
});