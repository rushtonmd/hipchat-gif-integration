Teams = new Mongo.Collection('teams');
Issues = new Mongo.Collection('issues');

Session.setDefault('searching', false);

Tracker.autorun(function() {
	if (Session.get('query')) {
		var searchHandle = Meteor.subscribe('labelSearch', Session.get('query'));
		Session.set('searching', !searchHandle.ready());
		builtColumn();
	}
});

Template.teams.events({
	'submit form': function(event, template) {
		console.log("HERE!");
		event.preventDefault();
		var query = template.$('input[type=text]').val();
		if (query)
			Session.set('query', query);
	}
});

Template.teams.helpers({
	teams: function() {
		return Teams.find();
	},
	issues: function() {
		return Issues.find();
	},
	searching: function() {
		return Session.get('searching');
	}
});

function builtColumn() {

	var allIssues = Issues.find().fetch();

	// Group by date
	allIssues = _.groupBy(allIssues, function(issue) {
		//return moment(issue.created).format("YYYY MMM [(wk]ww)");
		return moment(issue.created).format("YYYY MMM");
		//	return issue.customfield_10005;
	});

	allIssues = _.map(allIssues, function(item, key) {
		var p = _.reduce(item, function(memo, i) {
			return memo + (parseInt(i.storyPoints) || 0);
		}, 0);
		console.log({
			date: key,
			totalPoints: _.map(item, function(i) {
				return i.storyPoints
			})
		});
		return {
			date: key,
			totalPoints: _.map(item, function(i){
				return i.storyPoints;
			})
		};
	});

	var dataSeries = _.map(allIssues, function(i) {
		return i.totalPoints
	});

	console.log(dataSeries);

	var issuesXAxis = _.map(allIssues, function(i) {
		return i.date;
	});

	var totalOpenPoints = _.reduce(Issues.find().fetch(), function(memo, issue) {
		if (issue.status !== "Done") return memo + issue.storyPoints;
		return memo;
	}, 0);

	var idealVelocity = 40;
	var upperVelocity = 25;
	var idealWeeks = Math.ceil(totalOpenPoints / idealVelocity);
	var upperWeeks = Math.ceil(totalOpenPoints / upperVelocity);

	var idealSeries = [];
	var upperSeries = [];
	var todaySeries = [];
	for (var i = 0; i < dataSeries.length; i++) {
		idealSeries.push(null);
		upperSeries.push(null);
		todaySeries.push(null);
	}

	todaySeries.push(totalOpenPoints);
	issuesXAxis.push(moment().format("[Today:] YYYY MMM [(wk]ww)"));

	for (var i = 0; i < idealWeeks; i++) {
		idealSeries.push(totalOpenPoints - (i * totalOpenPoints / idealWeeks));
	}
	idealSeries.push(0);

	for (var i = 0; i < upperWeeks; i++) {
		upperSeries.push(totalOpenPoints - (i * totalOpenPoints / upperWeeks));
		issuesXAxis.push(moment().add(i + 1, 'week').format("YYYY MMM [(wk]ww)"));
	}
	upperSeries.push(0);



	$('#container-column').highcharts({

		// chart: {
		//     type: 'column'
		// },

		title: {
			text: 'Label Search: ' + Session.get('query')
		},

		subtitle: {
			text: '90% Confidence Velocity: 50pts - 80pts'
		},

		credits: {
			enabled: false
		},

		xAxis: {
			categories: issuesXAxis
			// categories: [
			//     'Jan',
			//     'Feb',
			//     'Mar',
			//     'Apr',
			//     'May',
			//     'Jun',
			//     'Jul',
			//     'Aug',
			//     'Sep',
			//     'Oct',
			//     'Nov',
			//     'Dec'
			// ]
		},

		yAxis: [{
			min: 0,
			title: {
				text: 'Story Points'
			}
		}, { // Secondary yAxis
			title: {
				text: 'Total Stories',
				style: {
					color: Highcharts.getOptions().colors[0]
				}
			},
			labels: {
				format: '{value}',
				style: {
					color: Highcharts.getOptions().colors[0]
				}
			},
			opposite: true
		}],

		tooltip: {
			headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
			pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
				'<td style="padding:0"><b>{point.y:,.0f}</b></td></tr>',
			footerFormat: '</table>',
			shared: true,
			useHTML: true
		},

		plotOptions: {
			column: {
				pointPadding: 0.2,
				borderWidth: 0
			},
			series: {
				fillOpacity: 0.1
			}
		},

		series: [{
			type: 'scatter',
			yAxis: 1,
			name: 'Story Points Added',
			data: [[0, 50], [0, 30]]
		}, {
			type: 'column',
			name: 'Open Story Points Today',
			data: todaySeries
		}, {
			type: 'area',
			name: 'Ideal Completion',
			data: idealSeries
		}, {
			type: 'area',
			name: 'Latest Completion',
			data: upperSeries
		}]

		// series: [{
		// 	type: 'column',
		//     name: 'Tokyo',
		//     data: [49.9, 71.5, 106.4, 129.2, 144.0, 176.0, 135.6, 148.5, 216.4, 194.1, 95.6, 54.4]

		// }, {
		// 	type: 'column',
		//     name: 'New York',
		//     data: [23,78.8, 98.5, 93.4, 106.0, 84.5, 105.0, 104.3, 91.2, 83.5, 106.6, 92.3]

		// }, {
		// 	type: 'area',
		//     name: 'London',
		//     data: [null, null, null, 41.4, 47.0, 48.3, 59.0, 59.6, 52.4, 65.2, 59.3, 51.2]

		// }, {
		// 	type: 'spline',
		//     name: 'Berlin',
		//     data: [42.4, 33.2, 34.5, -39.7, 52.6, 75.5, -57.4, 60.4, 47.6, 39.1, 46.8, 51.1]

		// }]
	});
}

/*
 * Call the function to built the chart when the template is rendered
 */
Template.highcharts.rendered = function() {
	builtColumn();
}



// Load the fonts
Highcharts.createElement('link', {
	href: '//fonts.googleapis.com/css?family=Dosis:400,600',
	rel: 'stylesheet',
	type: 'text/css'
}, null, document.getElementsByTagName('head')[0]);

Highcharts.theme = {
	colors: ["#7cb5ec", "#f7a35c", "#90ee7e", "#7798BF", "#aaeeee", "#ff0066", "#eeaaee",
		"#55BF3B", "#DF5353", "#7798BF", "#aaeeee"
	],
	chart: {
		backgroundColor: null,
		style: {
			fontFamily: "Dosis, sans-serif"
		}
	},
	title: {
		style: {
			fontSize: '16px',
			fontWeight: 'bold',
			textTransform: 'uppercase'
		}
	},
	tooltip: {
		borderWidth: 0,
		backgroundColor: 'rgba(219,219,216,0.8)',
		shadow: false
	},
	legend: {
		itemStyle: {
			fontWeight: 'bold',
			fontSize: '13px'
		}
	},
	xAxis: {
		gridLineWidth: 1,
		labels: {
			style: {
				fontSize: '12px'
			}
		}
	},
	yAxis: {
		minorTickInterval: 'auto',
		title: {
			style: {
				textTransform: 'uppercase'
			}
		},
		labels: {
			style: {
				fontSize: '12px'
			}
		}
	},
	plotOptions: {
		candlestick: {
			lineColor: '#404048'
		}
	},


	// General
	background2: '#F0F0EA'

};

// Apply the theme
Highcharts.setOptions(Highcharts.theme);