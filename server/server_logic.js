// Example POST Request
// {
//     event: 'room_message',
//     item: {
//         message: {
//             date: '2015-01-20T22:45:06.662545+00:00',
//             from: {
//                 id: 1661743,
//                 mention_name: 'Blinky',
//                 name: 'Blinky the Three Eyed Fish'
//             },
//             id: '00a3eb7f-fac5-496a-8d64-a9050c712ca1',
//             mentions: [],
//             message: '/weather',
//             type: 'message'
//         },
//         room: {
//             id: 1147567,
//             name: 'The Weather Channel'
//         }
//     },
//     webhook_id: 578829
// }


// Example api curl
// curl -d '{"color": "green", "mssage": "My first notification (yey)", "notify": false, "message_format": "text", "item": {"message": {"from": {"mention_name": "@MarkDRushton"}, "message": "/sfun add testcat http://google"} }  }' -H 'Content-Type: application/json' localhost:3000/api/v1/gifs/sfun




// FindGifs: Namespace for all sfun logic
FindGifs = {
	validActions: ["add", "remove", "help", "categories", "gif"],

	approvedAdmins: ["@JustinPerez", "@MarkDRushton", "@Parhelion"],

	invalidCredentialsGif: "http://i.imgur.com/egUwx5Q.gif",

	validateUser: function validateUser(mention_name) {
		return FindGifs.approvedAdmins.indexOf(mention_name) >= 0;
	},

	findGif: function findGif(params, gifCollection) {

		var search = {};

		if (params.category !== 'random') search = {
			type: params.category
		};

		var gifList = gifCollection.find(search).fetch();

		if (gifList.length === 0) {
			return {
				message: "I got nuthin'"
			};
		}

		var seed = Math.floor(Math.random() * gifList.length);

		return gifList[seed];

	},

	processParams: function(params) {
		switch (params.action) {
			case "gif":
				return FindGifs.findGif(params, Gifs);
				break;
			case "add":
				if (FindGifs.validateUser(params.mention_name)) {
					return FindGifs.addGif(params, Gifs);
				} else {
					return {
						message: FindGifs.invalidCredentialsGif
					};
				}
				break;
			case "remove":
				if (FindGifs.validateUser(params.mention_name)) {
						return FindGifs.removeGif(params, Gifs);
				} else {
					return {
						message: FindGifs.invalidCredentialsGif
					};
				}
				break;
			case "categories":
				return FindGifs.getCategories(params, Gifs);
				break;
			case "help":
				return FindGifs.getHelp(params, Gifs);
				break;
			default:
				return {
					message: "Huh?"
				};

		}
	},

	parseParams: function parseParams(params) {
		if ((((params || {}).item || {}).message || {}).message === undefined) throw "Wrong params";
		if (((((params || {}).item || {}).message || {}).from || {}).mention_name === undefined) throw "Wrong params";

		var paramList = params.item.message.message.split(" ");

		var paramObj = {
			slashCommand: paramList[0],
			mention_name: params.item.message.from.mention_name
		};

		// Find action
		if (FindGifs.validActions.indexOf(paramList[1]) >= 0) {

			paramObj.action = paramList[1].toLowerCase();

			switch (paramObj.action) {
				case "add":
					if (paramList[2]) paramObj.category = paramList[2].toLowerCase();
					if (paramList[3]) paramObj.link = paramList[3];
					break;
				case "remove":
					if (paramList[2]) paramObj.link = paramList[2];
					break;
			}

		} else {
			paramObj.action = "gif";
			if (paramList[1]) paramObj.category = paramList[1].toLowerCase();
		}

		return paramObj;
	},

	addGif: function(params, gifCollection) {
		var upsertResult = gifCollection.upsert({
			message: params.link
		}, {
			$set: {
				type: params.category,
				color: "red",
				message: params.link,
				notify: false,
				message_format: "text"
			}
		});
		return {
			message: "Gif Added.",
			numberAffected: upsertResult.numberAffected
		};
	},

	removeGif: function(params, gifCollection) {
		var removeResult = gifCollection.remove({
			message: params.link
		});

		if (removeResult === 0) {
			return {
				message: "Gif Not Found.",
				numberAffected: removeResult
			};
		} else {
			return {
				message: "Gif Removed.",
				numberAffected: removeResult
			};
		}

	},

	getCategories: function(params, gifCollection) {
		var distinctCategories = _.uniq(gifCollection.find({}, {
			sort: {
				type: 1
			},
			fields: {
				type: true
			}
		}).fetch().map(function(x) {
			return x.type;
		}), true);
		var msg = "Categories: " + distinctCategories;
		return {
			message: msg
		};
	},

	getHelp: function() {
		var helpMsg = "HELP:\r\nSLASH+sfun add [category] [url] <- adds a new image for a category\r\nSLASH+sfun remove [url] <- removes an image\r\nSLASH+sfun categories <- lists categories"
		return {
			message: helpMsg
		};
	}
};


Meteor.startup(function() {

	// Global configuration
	Api = new Restivus({
		version: 'v1',
		useDefaultAuth: true,
		prettyJson: true
	});

	// Maps to: POST /gifs/sfun
	Api.addRoute('gifs/sfun', {
		authRequired: false
	}, {
		post: {
			action: function() {

				var params = FindGifs.parseParams(this.bodyParams);
				
				var result = FindGifs.processParams(params);

				if (result) {
					return {
						notify: "false",
						message_format: "text",
						message: result.message
					};
				}
				return {
					statusCode: 400,
					body: {
						status: "fail",
						message: "Oh noes! It all went wrong."
					}
				};
			}
		}
	});
});