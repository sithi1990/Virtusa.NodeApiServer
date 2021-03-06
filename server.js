// =======================
// get the packages we need ============
// =======================

var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');
var HttpClient = require('node-rest-client').Client;
var httpClient = new HttpClient();

var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config'); // get our config file
var UserCoordinate   = require('./app/models/user_coordinate'); // get our mongoose model
    
// =======================
// configuration =========
// =======================
var port = process.env.PORT || 8079; // used to create, sign, and verify tokens
mongoose.connect(config.database); // connect to database
app.set('superSecret', config.secret); // secret variable

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

var io = require('socket.io').listen(app.listen(port));

console.log('API started at http://localhost:' + port);
// API ROUTES -------------------

// get an instance of the router for api routes
var apiRoutes = express.Router(); 

// route middleware to verify a token
apiRoutes.use(function(req, res, next) {

	// check header or url parameters or post parameters for token
	var token = req.body.token || req.query.token || req.headers['x-access-token'];

    var args = {
		headers: { "Content-Type": "application/json","x-access-token": token}
	};
	 
	httpClient.get("http://localhost:8078/authapi/userinfo", args, function (userInfo, response) {
		
	
			if(userInfo.success)
			{
				// if everything is good, save to request for use in other routes
				req.userInfo = userInfo;    
				next();
			}
			else
			{
				return res.json({ success: false, message: 'Failed to authenticate token.' });
			}

	});

  /* // decode token
  if (token) {

    // verifies secret and checks exp
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;    
        next();
      }
    });

  } else {

    // if there is no token
    // return an error
    res.json({ success: false, message: 'Failed to authenticate token.' });
    
  } */
});

 apiRoutes.get('/', function(req, res) {
  res.json({ message: 'Welcome to the coolest API on earth!' });
});


apiRoutes.post('/saveuserdata', function(req, res) {
  UserCoordinate.findOne({userName : req.userInfo.userName}, function(err, userCoordinate) {
  
	if (err) res.json({ success: false, message:err });

	if(userCoordinate != null)
	{
		userCoordinate.name= req.body.name;
		userCoordinate.longitude= req.body.longitude;
		userCoordinate.latitude= req.body.latitude;
		
		userCoordinate.save(function(err) {
			if (err) res.json({ success: false, message:err });

			console.log('User data successfully updated');
			res.json({ success: true });
		});
	}
	
	else
	{
		var newUserCoordinate= new UserCoordinate({ 
			userName:req.userInfo.userName,
			email:req.userInfo.email,
			name:req.body.name,
			longitude: req.body.longitude,
			latitude: req.body.latitude
		});
		
		newUserCoordinate.save(function(err) {
			if (err) res.json({ success: false, message:err });

			console.log('User added successfully');
			res.json({ success: true });
		});
	}
	
	
  });
});  

/* apiRoutes.post('/updatecoordinates', function(req, res) {
  UserCoordinate.findOne({userName : req.userInfo.userName}, function(err, userCoordinate) {
  
	if (err) res.json({ success: false, message:err });
    userCoordinate.name=req.userInfo.name,
	userCoordinate.longitude= req.body.longitude;
	userCoordinate.latitude= req.body.latitude;

	userCoordinate.save(function(err) {
		if (err) res.json({ success: false, message:err });

		console.log('Coordinate saved successfully');
		io.emit('coordinate_changed', "Changed");
		res.json({ success: true });
	});
	
  });
});   */ 

apiRoutes.get('/selectedusercoordinate', function(req, res) {

  
	UserCoordinate.findOne({userName : req.userInfo.userName}, function(err, userCoordinate) {
  
			if (err) res.json({ success: false, message:err });
			
			if(!userCoordinate)
			{
				res.json({ success: false, message:"User Not Found" });				
			}
			else
			{
				userDetail={};
				userDetail.userName=userCoordinate.userName;
				userDetail.email=userCoordinate.email;
				userDetail.name=userCoordinate.name;
				userDetail.longitude=userCoordinate.longitude;
				userDetail.latitude=userCoordinate.latitude;
				res.json({ userCoordinate: userDetail, success: true });
			}
			
			
	
	});

}); 

apiRoutes.get('/usercoordinates', function(req, res) {

	UserCoordinate.find({}, function(err, userCoordinates) {
  
		if (err) res.json({ success: false, message:err });
		
		var userDetails=new Array();
		userCoordinates.forEach(function(userCoordinate){
			userDetail={};
			userDetail.userName=userCoordinate.userName;
			userDetail.email=userCoordinate.email;
			userDetail.name=userCoordinate.name;
			userDetail.longitude=userCoordinate.longitude;
			userDetail.latitude=userCoordinate.latitude;
			userDetails.push(userDetail);
		});
		
		res.json({ userCoordinates: userDetails, success: true });
	});

});   

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);



/* io.on('connection', function (socket) {
  socket.on('hi', function(msg){
    io.emit('hinew', msg);
  });
}); */