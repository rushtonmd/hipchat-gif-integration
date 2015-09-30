describe("FindGifs spec", function() {

	describe("findGif() spec", function() {
	  it("Returns a single image.", function() {

	  	var gif = FindGifs.findGif({test: "you"});
	    expect(gif).toBeDefined();
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
			params.item.message.message = "/sfun add category url";

			var val = FindGifs.parseParams(params);

			expect(typeof(val)).toEqual("object");
			expect(val.action).toEqual("add");
			expect(val.category).toEqual("category");
			expect(val.link).toEqual("url");

		});
		// it("Returns an object with correct params values for remove", function() {

		// 	// expecting params.item.message.message
		// 	var params = {};
		// 	params.item = {};
		// 	params.item.message = {};
		// 	params.item.message.message = "/sfun remove url";

		// 	var val = FindGifs.parseParams(params);

		// 	expect(typeof(val)).toEqual("object");
		// 	expect(val.action).toEqual("remove");
		// 	expect(val.category).toBe(undefined);
		// 	expect(val.link).toEqual("url");

		// });
	});
});

