Teams = new Mongo.Collection('teams');
Issues = new Mongo.Collection('issues');

Session.setDefault('searching', false);
Session.setDefault('confidenceLow', 60);
Session.setDefault('confidenceHigh', 80);

Tracker.autorun(function() {

    if (Session.get('query')) {

        var searchHandle = Meteor.subscribe('labelSearch', Session.get('query'));

        Session.set('searching', !searchHandle.ready());

        buildLabelSearchChart();

    }

    Meteor.subscribe('teamList');

});

Template.teams.events({

    'submit .label-search-form': function(event, template) {

        event.preventDefault();

        var query = template.$('#labelSearchInput').val();

        if (query)

            Session.set('query', query);
    },

    'submit .chart-params-form': function(event, template) {

        event.preventDefault();

        var confidenceLow = template.$('#chartConfidenceLow').val();
        var confidenceHigh = template.$('#chartConfidenceHigh').val();

        Session.set('confidenceLow', confidenceLow);
        Session.set('confidenceHigh', confidenceHigh);

        buildLabelSearchChart();

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
    },

    confidenceHigh: function() {
        return Session.get('confidenceHigh');
    },

    confidenceLow: function() {
        return Session.get('confidenceLow');
    }
});

function buildLabelSearchChart() {

    // Need to get all unique date groups in YYYY MMM format for created and done dates

    var allUniqueDates = [];

    Issues.find().forEach(function(issue) {

        var d1 = moment(issue.created).format("YYYY MMM");
        var d2 = moment(issue.doneDate).format("YYYY MMM");

        if (d1 !== "Invalid date") allUniqueDates.push(d1);
        if (d2 !== "Invalid date") allUniqueDates.push(d2);

    });

    allUniqueDates = _.sortBy(_.uniq(allUniqueDates), function(d) {

        return moment(d, "YYYY MMM").format("YYYYMMDD");

    });

    var allIssues = Issues.find().fetch();

    if (allIssues.length <= 0) return;

    // Group by date
    allIssues = _.groupBy(allIssues, function(issue) {

        return moment(issue.created).format("YYYY MMM");

    });

    allIssues = _.map(allIssues, function(item, key) {

        var p = _.reduce(item, function(memo, i) {

            return memo + (parseInt(i.storyPoints) || 0);

        }, 0);

        return {

            date: key,

            totalPoints: _.reduce(item, function(memo, i) {

                return memo += (i.storyPoints || 0);

            }, 0)

        };

    });

    issuesXAxis = allUniqueDates;

    var openSeries = _.map(allIssues, function(i) {

        return i.totalPoints

    });

    // the data series needs to be an array of X,Y values
    var dataSeries = _.map(Issues.find().fetch(), function(item, key) {

        var createdFormat = moment(item.created).format("YYYY MMM");

        var offset = moment(item.created).format("DD") / 31 - 0.5;

        return [issuesXAxis.indexOf(createdFormat) + offset, item.storyPoints || 0];

    });

    var doneSeries = [];

    for (var i = 0; i < issuesXAxis.length; i++) {

        doneSeries.push([i, 0]);

    }

    _.each(Issues.find().fetch(), function(item, key) {

        if (item.doneDate && item.status === "Done") {

            var doneFormat = moment(item.doneDate).format("YYYY MMM");

            doneSeries[issuesXAxis.indexOf(doneFormat)][1] += (item.storyPoints || 0);

        }

    });



    var totalOpenPoints = _.reduce(Issues.find().fetch(), function(memo, issue) {

        if (issue.status !== "Done") return memo + issue.storyPoints;

        return memo;

    }, 0);

    var idealVelocity = Session.get('confidenceHigh');
    var upperVelocity = Session.get('confidenceLow');

    var idealWeeks = Math.ceil(totalOpenPoints / idealVelocity);
    var upperWeeks = Math.ceil(totalOpenPoints / upperVelocity);

    var idealSeries = [];
    var upperSeries = [];
    var todaySeries = [];

    for (var i = 0; i < issuesXAxis.length; i++) {

        idealSeries.push(null);
        upperSeries.push(null);
        todaySeries.push(null);

    }

    todaySeries.push(totalOpenPoints);

    issuesXAxis.push("Sprint Start<br/>" + moment().day(8).format("YYYY MMM DD"));

    for (var i = 0; i < idealWeeks; i++) {

        idealSeries.push(totalOpenPoints - (i * totalOpenPoints / idealWeeks));

    }

    idealSeries.push(0);

    for (var i = 0; i < upperWeeks; i++) {

        upperSeries.push(totalOpenPoints - (i * totalOpenPoints / upperWeeks));

        var numSprints = i + 1;

        issuesXAxis.push(moment().day(8).add(2 * numSprints, 'week').format("MMM DD") + "<br/>(sprint " + numSprints + ")");
    
    }
    
    upperSeries.push(0);

    $('#container-column').highcharts({

        title: {
            text: 'Label Search: ' + Session.get('query')
        },

        subtitle: {
            text: 'Conservative:  ' + Session.get('confidenceLow') + 'pts - Ideal: ' + Session.get('confidenceHigh') + 'pts'
        },

        credits: {
            enabled: false
        },

        xAxis: {
            categories: issuesXAxis
        },

        yAxis: [{ // Secondary yAxis
            min: 0,
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
            }
        }, {
            min: 0,
            title: {
                text: 'Story Points'
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
            },
            scatter: {
                marker: {
                    radius: 7
                }
            }
        },

        series: [{
            type: 'scatter',
            color: 'rgba(34,83,120,0.1)',
            name: 'Created Stories',
            data: dataSeries,
            tooltip: {
                headerFormat: '<span style="font-size:10px"></span><table>',
                pointFormat: '<tr><td>Story Points:</td>' +
                    '<td style="padding:0"><b>{point.y:,.0f}</b></td></tr>',
                footerFormat: '</table>',
                shared: true,
                useHTML: true
            }
        }, {
            type: 'column',
            color: 'rgba(22, 149, 163, 0.5)',
            yAxis: 1,
            name: 'Opened Stories',
            data: openSeries,
            pointPadding: -0.2,
            pointPlacement: 0
        }, {
            type: 'column',
            color: 'rgba(235, 127, 0, 0.5)',
            yAxis: 1,
            name: 'Completed Stories',
            data: doneSeries,
            pointPadding: -0.2,
            pointPlacement: 0.2
        }, {
            type: 'area',
            color: 'rgba(235, 127, 0, 0.8)',
            yAxis: 1,
            name: 'Ideal Completion',
            data: idealSeries
        }, {
            type: 'area',
            color: 'rgba(191,59,0,0.8)',
            yAxis: 1,
            name: 'Latest Completion',
            data: upperSeries
        }, {
            type: 'column',
            color: 'rgba(34,83,120,1)',
            yAxis: 1,
            name: 'Open Stories Today',
            data: todaySeries,
            pointPadding: -0.2,
            pointPlacement: -0.2
        }]

    });
}

/*
 * Call the function to built the chart when the template is rendered
 */
Template.highcharts.rendered = function() {

    buildLabelSearchChart();

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

    background2: '#F0F0EA'

};

// Apply the theme
Highcharts.setOptions(Highcharts.theme);