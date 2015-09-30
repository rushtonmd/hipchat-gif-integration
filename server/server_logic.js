
//curl -d '{"color": "green", "mssage": "My first notification (yey)", "notify": false, "message_format": "text", "item": {"message": {"message": "/sfun panic"} }  }' -H 'Content-Type: application/json' localhost:3000/api/v1/gifs/sfun


//curl -d '{"color": "green", "mssage": "My first notification (yey)", "notify": false, "message_format": "text", "item": {"message": {"message": "/sfun add panic http://sungevity.com"} }  }' -H 'Content-Type: application/json' localhost:3000/api/v1/gifs/sfun



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

FindGifs = {
  validActions: ["add", "remove", "help", "categries", "gif"],
  findGif: function findGif(params){
    return {test:"me"};
  },
  parseParams: function parseParams(params){
    if((((params || {}).item || {}).message || {}).message === undefined) throw "Wrong params";

    var paramList = params.item.message.message.split(" ");

    var paramObj = {
      slashCommand: paramList[0]
    };

    // Find action
    if (FindGifs.validActions.indexOf(paramList[1]) >= 0) {
    
      paramObj.action = paramList[1].toLowerCase();
      
      if (paramList[2]) paramObj.category = paramList[2].toLowerCase();
    }
    else {
      paramObj.action = "gif";
      paramObj.category = paramList[1].toLowerCase();
    }

    paramObj.link = paramList[3];

    return paramObj;
  }
};

var findGif = function findGif(params){
  try{


  // restrict adding by user


  // Look at params.item.message.message
    var message = params.item.message.message;

    var action = message.split(" ")[1].toLowerCase();

    if (action === "add") {
      // add a new gif
      var type = message.split(" ")[2].toLowerCase();
      var link = message.split(" ")[3];
      //console.log("Adding gif " + type + " : " + Gifs.find().fetch().length);
      Gifs.upsert({message: link},{
        $set: {
          type: type,
          color: "red",
          message: link,
          notify: false,
          message_format: "text"
        }
      });
      return {message: "Gif Added."};
    };

    if (action === "categories"){
      var distinctCategories = _.uniq(Gifs.find({}, {
            sort: {type: 1}, fields: {type: true}
        }).fetch().map(function(x) {
            return x.type;
        }), true);
      var msg = "Categories: " + distinctCategories;
      return {message: msg};
    }

    if (action === "help"){
      var helpMsg = "HELP:\r\nSLASH+sfun add [category] [url] <- adds a new image for a category\r\nSLASH+sfun remove [url] <- removes an image\r\nSLASH+sfun categories <- lists categories"
      return {message: helpMsg};
    }

    if (action === "remove"){
      // add a new gif
      var type = message.split(" ")[2].toLowerCase();
      var link = message.split(" ")[3];
      //console.log("Removing gif " + type + " : " + Gifs.find().fetch().length);
      Gifs.remove({message: link});
      return {message: "Gif Removed."};
    };

    if (action) {
      // display 
      var gifList = Gifs.find({type: action}).fetch();
      var seed = Math.floor(Math.random() * gifList.length);
      //console.log(gifList[seed]);
      return gifList[seed];
    }
  }
  catch(err){
    return "Oh noes... what did you do?!?!";
  }

};

  Meteor.startup(function () {
    // Global configuration
    Api = new Restivus({
      version: 'v1',
      useDefaultAuth: true,
      prettyJson: true
    });
 
    // Generates: GET/POST on /api/v1/users, and GET/PUT/DELETE on /api/v1/users/:id 
    // for Meteor.users collection (works on any Mongo collection)
    Api.addCollection(Gifs);
    // That's it! Many more options are available if needed...
 
    // // Maps to: POST /api/v1/articles/:id
    // Api.addRoute('gifs/random', {authRequired: false}, {
    //   get: {
    //     action: function () {
    //       var gif = Gifs.findOne({});
    //       if (gif) {
    //         return gif;
    //       }
    //       return {
    //         statusCode: 400,
    //         body: {status: "fail", message: "Unable to add article"}
    //       };
    //     }
    //   }
    // });

        // Maps to: POST /api/v1/articles/:id
    Api.addRoute('gifs/sfun', {authRequired: false}, {
      post: {
        action: function () {

          var gif = findGif(this.bodyParams);
          //var gif = Gifs.findOne({});
          if (gif) {
            // var result = Meteor.http.post(
            //     "https://api.hipchat.com/v2/room/1981253/notification?auth_token=QNL9fyiQGo0PVbztHqfWG7nP4p3Vf58rQINiRcaK",
            //     { data: { color: "red", message: "http://rack.0.mshcdn.com/media/ZgkyMDEzLzA2LzE4LzM5L3Bhbmlja2luZ2NhLmQxYjIwLmdpZgpwCXRodW1iCTEyMDB4OTYwMD4/bda233e5/806/panicking-cat.gif", notify: "false", message_format: "text"} } );

              return {
                //message: this.bodyParams.item.message};
                notify: "false", 
                message_format: "text",
                message: gif.message
              };
          }
          return {
            statusCode: 400,
            body: {status: "fail", message: "Unable to add article"}
          };
        }
      }
    });

  });