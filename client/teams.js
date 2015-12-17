Teams = new Mongo.Collection('teams');
Issues = new Mongo.Collection('issues');

Session.setDefault('searching', false);
Session.setDefault('confidenceLow', 60);
Session.setDefault('confidenceHigh', 80);

Tracker.autorun(function() {
    if (Session.get('query')) {
        var searchHandle = Meteor.subscribe('labelSearch', Session.get('query'));
        Session.set('searching', !searchHandle.ready());
        builtColumn();
    }
});

Template.teams.events({
    'submit .label-search-form': function(event, template) {
        console.log("HERE!");
        event.preventDefault();
        //var query = template.$('input[type=text]').val();
        var query = template.$('#labelSearchInput').val();
        console.log("HERE: " + query);
        if (query)
            Session.set('query', query);
    },
    'submit .chart-params-form': function(event, template) {
        console.log("HERE!");
        event.preventDefault();
        //var query = template.$('input[type=text]').val();
        var confidenceLow = template.$('#chartConfidenceLow').val();
        var confidenceHigh = template.$('#chartConfidenceHigh').val();
        Session.set('confidenceLow', confidenceLow);
        Session.set('confidenceHigh', confidenceHigh);
        builtColumn();
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
    confidenceHigh: function(){
    	return Session.get('confidenceHigh');
    },
    confidenceLow: function(){
    	return Session.get('confidenceLow');
    }
});

function builtColumn() {

    var allIssues = Issues.find().fetch();

    if(allIssues.length <= 0) return;

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
        return {
            date: key,
            totalPoints: _.reduce(item, function(memo, i) {
                return memo += (i.storyPoints || 0);
            }, 0)
        };
    });

    var issuesXAxis = _.map(allIssues, function(i) {
        return i.date;
    });

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
    //var openSeries = [];
    for(var i = 0; i < issuesXAxis.length; i++){
        doneSeries.push([i,0]);
        //openSeries.push([i,0]);
    } 

    //console.log(issuesXAxis);
    

    _.each(Issues.find().fetch(), function(item, key) {
        
        if (item.doneDate && item.status === "Done"){
            var doneFormat = moment(item.doneDate).format("YYYY MMM");
            doneSeries[issuesXAxis.indexOf(doneFormat)][1] += (item.storyPoints || 0);
        } 
    });



    var totalOpenPoints = _.reduce(Issues.find().fetch(), function(memo, issue) {
        if (issue.status !== "Done") return memo + issue.storyPoints;
        return memo;
    }, 0);

    var idealVelocity = Session.get('confidenceHigh') / 2;
    var upperVelocity = Session.get('confidenceLow') / 2;
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
            text: 'Conservative:  ' + Session.get('confidenceLow') + 'pts - Ideal: ' + Session.get('confidenceHigh') + 'pts'
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
            //color: 'rgba(34,83,120,0.5)',
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
        },{
            type: 'column',
            color: 'rgba(34,83,120,1)',
            yAxis: 1,
            name: 'Open Stories Today',
            data: todaySeries,
            pointPadding: -0.2,
            pointPlacement: -0.2
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