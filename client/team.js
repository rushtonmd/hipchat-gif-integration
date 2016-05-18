// Team Statistics Collection
TeamStatistics = new Mongo.Collection('teamStatistics');

// Initiate session value for buildingcharts
Session.setDefault('buildingcharts', false);

// Create function for when teamhighcharts template is rendered
Template.teamhighcharts.rendered = function() {
    buildTeamDoneChart();
}

// Helpers for Team template
Template.team.helpers({
    teams: function() {
        return Teams.find({}, {sort:{name: 1}});
    },
    buildingcharts: function() {
        return Session.get('buildingcharts');
    }
});

// Events for Team template
Template.team.events({
    "change select.teamList": function(evt) {
      var newValue = $(evt.target).val();
      var oldValue = Session.get("selectedTeam");
      if (newValue != oldValue) {
        // value changed, let's do something... or not
      }
      Session.set("selectedTeam", newValue);
    }
});


// Autorun function for when a new team is selected
Tracker.autorun(function() {
    if (Session.get('selectedTeam')) {
        var searchHandle = Meteor.subscribe('teamDataSearch', Session.get('selectedTeam'));
        Session.set('buildingcharts', !searchHandle.ready());
        //buildTeamDoneChart();
        console.log("Team Changed!");
    }
});


// Build the chart
function buildTeamDoneChart() {

    var sprints = TeamStatistics.find().fetch().slice(0,8).reverse();

    var categories = _.map(sprints, function(s) {
        return s.sprintDetails.name;
    });

    var issuesDone = _.map(sprints, function(s) {
        return s.originalCommittedDone.storypoints;
    });

    var brickinsDone = _.map(sprints, function(s) {
        return s.brickinsDone.storypoints;
    });

    var commitment = _.map(sprints, function(s) {
        return s.commitment.storypoints;
    });

    var planDelta = _.map(sprints, function(s) {
        return s.issuesDone.storypoints - s.commitment.storypoints;
    });

    var averageValues = [];

    for (var i = 0; i < commitment.length; i++) {
        if (i === 0) averageValues[i] = issuesDone[i] + brickinsDone[i];
        else averageValues[i] = Math.round(((averageValues[i-1] * i) + issuesDone[i] + brickinsDone[i]) / (i+1));
    }

    var planDeltaPoints = [];
    for (var i = 0; i < commitment.length; i++) {
        var delta = 'NA'
        var delta = 100 * ((issuesDone[i] + brickinsDone[i]) / (commitment[i]));
        var fillColor = 'green';
        if (delta < 80) fillColor = 'red';
        var label = '' + Math.round(delta) + '%';
        planDeltaPoints[i] = {name: label, x: (i-0.35), y:(commitment[i] * 1.1), fillColor: fillColor};
    }

    
    $('#teamDoneChart').highcharts({
        chart: {
            type: 'column'
        },
        credits: {
            enabled: false
        },
        title: {
            text: 'Team Commitment Trend'
        },
        xAxis: {
            categories: categories
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Story Points'
            },
            minorTickInterval: 'auto',
            stackLabels: {
                enabled: true,
                style: {
                    fontWeight: 'bold',
                    color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray'
                }
            }
        },
        legend: {
            align: 'center',
            //x: -30,
            verticalAlign: 'bottom',
            //y: 25,
            floating: false,
            backgroundColor: (Highcharts.theme && Highcharts.theme.background2) || 'white',
            borderColor: '#CCC',
            borderWidth: 1,
            shadow: false
        },
        tooltip: {
            headerFormat: '<b>{point.x}</b><br/>',
            pointFormat: '{series.name}: {point.y}<br/>Total: {point.stackTotal}'
        },
        plotOptions: {
            column: {
                stacking: 'normal',
                dataLabels: {
                    enabled: true,
                    color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'white',
                    style: {
                        textShadow: '0 0 3px black'
                    }
                }
            },
            scatter: {
                dataLabels: {
                    enabled: true,
                    format: '<span style="font-size:16px">{point.name}</span>',
                    //color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'black',
                    style: {
                        textShadow: '0 0 3px white'
                    }
                },
              marker: {
                 radius: 8,
                 symbol: 'triangle-down'
              }
           }
        },
        series: [
        {
            stack: 'plan',
            name: 'Commitment',
            data: commitment
        }, {
            stack: 'combo',
            name: 'Done (Brickins)',
            data: brickinsDone
        }, {
            stack: 'combo',
            name: 'Done (Planned)',
            data: issuesDone
        },{
            type: 'spline',
            name: 'Average',
            data: averageValues,
            color: 'rgba(119, 152, 191,0.5)',
            marker: {
                lineWidth: 2,
                lineColor: 'rgba(119, 152, 191,0.5)',
                fillColor: 'white'
            },
            tooltip: {
                headerFormat: '<b>{point.x}</b><br/>',
                pointFormat: '{series.name}: {point.y}<br/>'
            }

        },{
            type: 'scatter',
            name: '80% Commitment Goal',
            data: planDeltaPoints, 
            enableMouseTracking: false, 
            tooltip: {
            }
        }
        
        ]
    });
};


