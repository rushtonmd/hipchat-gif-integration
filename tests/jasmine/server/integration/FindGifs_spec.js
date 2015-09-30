describe("FindGifs spec", function() {
	var gifs_spec = new Mongo.Collection('gifs_spec');	

	describe("removeGif() spec", function() {

		beforeAll(function() {
			var message = '!@#qweASD';
			gifs_spec.upsert({message: message},{
	        $set: {
	          type: "test_category",
	          color: "red",
	          message: message,
	          notify: false,
	          message_format: "text"
	        }
	      });
		});

		afterAll(function() {
			gifs_spec.remove({});
		});	

		it("Removes a gif from all collections", function() {
			var beginLength = gifs_spec.find().fetch().length;

			var params = {link: "!@#qweASD"};

			var result = FindGifs.removeGif(params, gifs_spec);

			var endLength = gifs_spec.find().fetch().length;

			expect(result.message).toEqual("Gif Removed.");
			expect(result.numberAffected).toEqual(1);
			expect(endLength).toEqual(beginLength - 1);

		});	
		it("Does't remove an invalid gif from all collections", function() {
			var beginLength = gifs_spec.find().fetch().length;

			var params = {link: "123qweasd"};

			var result = FindGifs.removeGif(params, gifs_spec);

			var endLength = gifs_spec.find().fetch().length;

			expect(result.message).toEqual("Gif Not Found.");
			expect(result.numberAffected).toEqual(0);
			expect(endLength).toEqual(beginLength);

		});	
	});

	describe("addGif() spec", function() {

		beforeAll(function() {
			var message = '!@#qweASD';
			gifs_spec.upsert({message: message},{
	        $set: {
	          type: "test_category",
	          color: "red",
	          message: message,
	          notify: false,
	          message_format: "text"
	        }
	      });
		});

		afterAll(function() {
			gifs_spec.remove({});
		});	

		it("Adds a gif to the collection", function() {
			var beginLength = gifs_spec.find().fetch().length;

			var params = {category:"new_category", link: "123qweasd"};

			var result = FindGifs.addGif(params, gifs_spec);

			var endLength = gifs_spec.find().fetch().length;

			expect(result.message).toEqual("Gif Added.");
			expect(result.numberAffected).toEqual(1);
			expect(endLength).toEqual(beginLength + 1);

		});	
		it("Doesn't a gif to the collection if it's a duplicate", function() {
			var beginLength = gifs_spec.find().fetch().length;

			var params = {category:"new_category", link: "!@#qweASD"};

			var result = FindGifs.addGif(params, gifs_spec);

			var endLength = gifs_spec.find().fetch().length;

			expect(result.message).toEqual("Gif Added.");
			expect(result.numberAffected).toEqual(1);
			expect(endLength).toEqual(beginLength);

		});	
	});

	describe("findGif() spec", function() {
		//var gifs_spec;

		beforeAll(function() {
			//gifs_spec = new Mongo.Collection('gifs_spec');
			var message = '!@#qweASD';
			gifs_spec.upsert({message: message},{
	        $set: {
	          type: "test_category",
	          color: "red",
	          message: message,
	          notify: false,
	          message_format: "text"
	        }
	      });
		});

		afterAll(function() {
			gifs_spec.remove({});
		});

		it("Returns a single image with a valid category", function() {
			var params = {};
			params.action = "gif";
			params.category = "test_category";

			var gif = FindGifs.findGif(params, gifs_spec);

			expect(gif).toBeDefined();
			expect(gif.message).toEqual('!@#qweASD');
		});

		it("Returns no image with a valid category", function() {
			var params = {};
			params.action = "gif";
			params.category = "not_valid_test_category";

			var gif = FindGifs.findGif(params, gifs_spec);

			expect(gif).toBeDefined();
			expect(gif.message).toEqual("I got nuthin'");
		});

		it("Returns a single image with a random category", function() {
			var params = {};
			params.action = "gif";
			params.category = "random";

			var gif = FindGifs.findGif(params, gifs_spec);

			expect(gif).toBeDefined();
			expect(gif.message).toBeDefined();
		});
	});

	describe("parseParams() spec", function() {
		it("Throws error with wrong number of nested params", function() {

			// expecting params.item.message.message
			var params = {};

			var func = function (){
				FindGifs.parseParams(params);
			};

			expect(func).toThrow();

		});
		it("Doesn't throw error with correct number of nested params", function() {

			// expecting params.item.message.message
			var params = {};
			params.item = {};
			params.item.message = {};
			params.item.message.message = "/sfun add category url";
			params.item.message.from = {};
			params.item.message.from.mention_name = "";

			var func = function (){
				FindGifs.parseParams(params);
			};

			expect(func).not.toThrow();
		});
		it("Returns an object for valid params", function() {

			// expecting params.item.message.message
			var params = {};
			params.item = {};
			params.item.message = {};
			params.item.message.message = "/sfun category";

			var val = FindGifs.parseParams(params);
			

			expect(typeof(val)).toEqual("object");
		});
		it("Returns an object with correct params values for add", function() {

			// expecting params.item.message.message
			var params = {};
			params.item = {};
			params.item.message = {};
			params.item.message.message = "/sfun add category Url123!@#";

			var val = FindGifs.parseParams(params);

			expect(typeof(val)).toEqual("object");
			expect(val.action).toEqual("add");
			expect(val.category).toEqual("category");
			expect(val.link).toEqual("Url123!@#");

		});
		it("Returns an object with correct params values for remove", function() {

			// expecting params.item.message.message
			var params = {};
			params.item = {};
			params.item.message = {};
			params.item.message.message = "/sfun remove Url123!@#";

			var val = FindGifs.parseParams(params);

			expect(typeof(val)).toEqual("object");
			expect(val.action).toEqual("remove");
			expect(val.category).toBe(undefined);
			expect(val.link).toEqual("Url123!@#");

		});

		it("Returns an object with correct params values for help", function() {

			// expecting params.item.message.message
			var params = {};
			params.item = {};
			params.item.message = {};
			params.item.message.message = "/sfun help";

			var val = FindGifs.parseParams(params);

			expect(typeof(val)).toEqual("object");
			expect(val.action).toEqual("help");
			expect(val.category).toBe(undefined);
			expect(val.link).toBe(undefined);

		});

		it("Returns an object with correct params values for categories", function() {

			// expecting params.item.message.message
			var params = {};
			params.item = {};
			params.item.message = {};
			params.item.message.message = "/sfun categories";

			var val = FindGifs.parseParams(params);

			expect(typeof(val)).toEqual("object");
			expect(val.action).toEqual("categories");
			expect(val.category).toBe(undefined);
			expect(val.link).toBe(undefined);

		});

		it("Returns an object with correct params values for gif", function() {

			// expecting params.item.message.message
			var params = {};
			params.item = {};
			params.item.message = {};
			params.item.message.message = "/sfun category";

			var val = FindGifs.parseParams(params);

			expect(typeof(val)).toEqual("object");
			expect(val.action).toEqual("gif");
			expect(val.category).toEqual("category");
			expect(val.link).toBe(undefined);

		});
	});
});

