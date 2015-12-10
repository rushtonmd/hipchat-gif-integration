Meteor.publish('teamsSearch', function(query) {
	console.log("Search: " + query);
	var self = this;
	try {
		var response = HTTP.get('https://www.googleapis.com/books/v1/volumes', {
			params: {
				q: query
			}
		});

		_.each(response.data.items, function(item) {
			var doc = {
				thumb: item.volumeInfo.imageLinks.smallThumbnail,
				title: item.volumeInfo.title,
				link: item.volumeInfo.infoLink,
				snippet: item.searchInfo && item.searchInfo.textSnippet
			};

			self.added('teams', Random.id(), doc);

		});

		console.log("READY!");
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

		var labelSearchUrl = 'https://sungevity.atlassian.net/rest/api/2/search?jql=labels%20in%20(' + query.trim() +')&maxResults=200&fields=summary,created,issuetype,status,customfield_10005';


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
			var doc = {
				key: item.key,
				storyPoints: item.fields.customfield_10005,
				created: item.fields.created,
				status: item.fields.status.statusCategory.name,
				type: item.fields.issuetype
			};

			self.added('issues', Random.id(), doc);

		});

		console.log("READY!");
		self.ready();

	} catch (error) {
		console.log(error);
	}
});