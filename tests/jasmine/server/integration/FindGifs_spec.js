describe("FindGifs spec", function() {

	describe("findGif() spec", function() {
		
	});

	describe("findGif() spec", function() {
		var gifs_spec;

		beforeAll(function() {
			gifs_spec = new Mongo.Collection('gifs_spec');
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

