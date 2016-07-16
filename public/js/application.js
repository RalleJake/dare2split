$(function() {
	// generate unique user id
	var userId = Math.random().toString(16).substring(2,15);
	var socket = io.connect('/');
	var map;
	var info = $('#infobox');
	var doc = $(document);

	var sentData = {};

	var connects = {};
	var markers = {};
	var active = false;

	socket.on('load:coords', function(data) {
		if (!(data.id in connects)) {
			setMarker(data);
		}

		connects[data.id] = data;
		connects[data.id].updated = $.now();
	});

	// check whether browser supports geolocation api
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(positionSuccess, positionError, { enableHighAccuracy: true });
	} else {
		$('.map').text('Your browser is out of fashion, there\'s no geolocation!');
	}


	function initMap(lat, lng) {
		var myLatLng = {lat: lat, lng: lng};

		// Create a map object and specify the DOM element for display.
		var map = new google.maps.Map(document.getElementById('map'), {
			center: myLatLng,
			scrollwheel: false,
			zoom: 15
		});

		// Create a marker and set its position.
		var marker = new google.maps.Marker({
			map: map,
			position: myLatLng,
			title: 'Hello World!'
		});
	}

	function positionSuccess(position) {
		var lat = position.coords.latitude;
		var lng = position.coords.longitude;
		var acr = position.coords.accuracy;
		$('.coords').text('lat: '+lat+', long: '+lng);

		initMap(lat, lng);

		var emit = $.now();
		// send coords on when user is active
		doc.on('mousemove', function() {
			active = true;

			sentData = {
				id: userId,
				active: active,
				coords: [{
					lat: lat,
					lng: lng,
					acr: acr
				}]
			};

			if ($.now() - emit > 30) {
				socket.emit('send:coords', sentData);
				emit = $.now();
			}
		});
	}

	doc.bind('mouseup mouseleave', function() {
		active = false;
	});

	// showing markers for connections
	function setMarker(data) {
		for (var i = 0; i < data.coords.length; i++) {
			var marker = L.marker([data.coords[i].lat, data.coords[i].lng], { icon: yellowIcon }).addTo(map);
			marker.bindPopup('<p>One more external user is here!</p>');
			markers[data.id] = marker;
		}
	}

	// handle geolocation api errors
	function positionError(error) {
		var errors = {
			1: 'Authorization fails', // permission denied
			2: 'Can\'t detect your location', //position unavailable
			3: 'Connection timeout' // timeout
		};
		showError('Error:' + errors[error.code]);
	}

	function showError(msg) {
		info.addClass('error').text(msg);

		doc.click(function() {
			info.removeClass('error');
		});
	}

	// delete inactive users every 15 sec
	setInterval(function() {
		for (var ident in connects){
			if ($.now() - connects[ident].updated > 15000) {
				delete connects[ident];
				map.removeLayer(markers[ident]);
			}
		}
	}, 15000);
});
