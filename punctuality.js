
/*--------------------------main---------------------------------------------*/
var radialObj = radialIndicator('#indicatorContainer', {
	barColor : '#009CD8',
	barWidth : 10,
	initValue : 0
});  
radialIndicator.defaults.radius = 40;
var submitButton;
//num of time that the employee arrived late in the period
var arrivedLate = 0;
//num of time that the employee left early in the period
var leftEarly = 0;
//the number of matched data between rosters and shifts
var length = 0;
var first = true;
var leftEarlyDates = [];
$(document).ready(function() {
	submitButton = document.getElementsByTagName("input")[2];
	init();
	submitButtonListener();
});

/*--------------------end of main--------------------------------------------*/

/* make a http get request to the server*/
function httpGet(theUrl) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false); // false for synchronous request
    xmlHttp.send(null);
    return xmlHttp.responseText;
}  

/*display the attendance form from 07/06/2014 to 23/06/2014 at the beginning*/
function init() {
	var shifts = JSON.parse(httpGet("http://localhost:4567/shifts/2014-06" +
		"-07/2014-06-23"));
	var rosters = JSON.parse(httpGet("http://localhost:4567/rosters/2014-" +
		"06-07/2014-06-23"));
	processData(rosters, shifts);
}

/*retrieve info from strings in json file*/
function processData(rosters, shifts) {
	rosters = cleanLists(rosters, shifts);
	shifts = cleanLists(shifts, rosters);
	length = rosters.length;
	readData(rosters, shifts);
	analyseData(rosters.length*2);
}

/*There are dates that exist in roster.csv but not in shifts.csv. And
Dates that exist in shift.csv but not in roster.csv. This function
gets rid of those unmatched dates stored in the rosters list and shifts list*/
function cleanLists(list1, list2) {
	var result = [];
	var count = 0;
	for(var i = 0; i < list1.length; i++) {
		var one = list1[i];
		for (var j = count; j < list2.length; j++) {
			var two = list2[j];
			if (one.date == two.date) {
				result.push(one);
				count = j;
				break;
			}
			if (one.date < two.date) {
				break;
			}
		}
	}
	return result;
}

/*read the cleaned data and retrieve info*/
function readData(rosters, shifts) {
	var tableData = [];
	for (var i = 0; i < rosters.length; i++) {
		var timeAbsent = 0;
		var roster = rosters[i];
		var shift = shifts[i];
		var rStart = timeForComparison(roster.start);
		var sStart = timeForComparison(shift.start);
		var rFinish = timeForComparison(roster.finish);
		var sFinish = timeForComparison(shift.finish);
		var actualStart = getActualStart(rStart, sStart);		
		var actualFinish = getActualFinish(rFinish, sFinish);
		if (actualFinish == "left early ") {
			timeAbsent = getTime(rFinish, sFinish);
		}
		var row = fillUpRow(roster, shift, actualStart, actualFinish, i, timeAbsent);
		tableData.push(row);
	}
	if (first) {
		$('table').DataTable({
			data: tableData,
			searching: false,
			"dom": 'rt<"top"flp><"bottom"i>',
			"oLanguage": {
				"sInfo": "showing _START_ to _END_ of _TOTAL_ shifts",
				"sLengthMenu": "Show _MENU_ shifts"
			  },

			"columns": [
				{ "width": "24%" },
				null,
				null,
				null,
				null
			  ]
		});
		 
		first = false;
	} else {
		var table = $('table').DataTable();
		table.rows.add(tableData);
		table.draw();
	}
	addListenerToRedBar();
}

function addListenerToRedBar() {
	$("body").on("mouseover", "div#redPopup", function(event) {
		$(this).find("span.popuptext").removeClass("disappear");
		$(this).find("span.popuptext").addClass("show");
	});

	$("body").on("mouseout", "div#redPopup", function(event) {
		$(this).find("span.popuptext").removeClass("show");
		$(this).find("span.popuptext").addClass("disappear");
	});
}

/* summary of results ("punctual: 8, left early: 2") */
function analyseData(total) {
	var box1 = document.getElementById("text1");
	var box2 = document.getElementById("text2");
	var box3 = document.getElementById("text3");
	var summary = document.getElementById("percentage");
	var punctual = total - leftEarly - arrivedLate;
	var percentage = Math.ceil((punctual/total)*100);
	box1.innerHTML = arrivedLate;
	box2.innerHTML = punctual;
	box3.innerHTML = leftEarly;
	summary.innerHTML = percentage;
	radialObj.animate(percentage);
}

/*extract the useful part of the 24hour time in json file for comparison*/
function timeForComparison(string) {
	if (string === null) {
		return "null";
	}
	var begin = string.indexOf(' ');
	var end = string.indexOf('+');
	var hour = parseInt(string.substring(begin+1, begin+3));
	return hour + string.substring(begin + 3, end - 3);
}

/*extract the useful part of the 24hour time in json file
and convert it to 12hour time with suffix am/pm */
function timeToString(string) {
	if (string === null) {
		return "null";
	}
	var begin = string.indexOf(' ');
	var end = string.indexOf('+');
	var hour = parseInt(string.substring(begin+1, begin+3));
	var AMPM = "am";
	if (hour > 12) {
		hour -= 12;
		AMPM = "pm";
	}
	return hour + string.substring(begin + 3, end - 3) + AMPM;
}

/*fill up a row in the attendance form for a specific date*/
function fillUpRow(roster, shift, actualStart, actualFinish, index, 
		timeAbsent) {
	var row = [];	
	var rosterStart = timeToString(roster.start);
	var rosterFinish = timeToString(roster.finish);
	var sFinish = timeToString(shift.finish);
	var date = dateConversion(roster.date); 
	var lastCol;
	if (timeAbsent == 0) {
		lastCol = actualFinish;
	} else {
		leftEarlyDates.push(roster.date);
		lastCol = actualFinish + "<div class='badge badge-danger popup' id='redPopup'>" + 
			timeAbsent + ' minutes' + "<span class='popuptext'>" + sFinish + "</span>"+ "</div>";
		}
	row.push(date, rosterStart, actualStart, rosterFinish, lastCol);
	return row;
}

function show(id) {
	console.log(id);
	var popup = document.getElementById(id);
	popup.classList.toggle("show");
}

function disappear() {
	var popup = document.getElementById(id);
	popup.classList.toggle("disappear");
}

/*translates the numerical date to English*/
function dateConversion(date) {
	var monthNames = ["January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"
];
	var day = parseInt(date.substring(8))+'';
	if ((day[0] != '1' && day[1] == '1') || 
			(day.length == 1 && day[0] == '1')) {
		
		day += "st ";
	
	} else if ((day[0] != '1' && day[1] == '2') ||
			(day.length == 1 && day[0] == '2')) {
	
		day += "nd ";
	
	} else if ((day[0] != '1' && day[1] == '3') ||
			(day.length == 1 && day[0] == '3')) {
	
		day += "rd ";
	
	} else {
		day += "th ";
	}
	var monthNum = parseInt(date.substring(5,7));
	var month = monthNames[monthNum-1];
	return month + " " + day + date.substring(0, 4);
}

/*calculate in minutes how long the employee was late for*/
function getTime(rFinish, sFinish) {
	var rFinishHr = parseInt(rFinish.substring(0, 3));
	var sFinishHr = parseInt(sFinish.substring(0, 3));
	var sFinishMin = parseInt(sFinish.substring(3));
	var rFinishMin = parseInt(rFinish.substring(3));
	var hr;
	if (sFinishHr < rFinishHr && (hr = rFinishHr - sFinishHr) > 1) {
		return  60 - sFinishMin + rFinishMin + (hr-1)*60;
	} else if (sFinishHr < rFinishHr && rFinishHr - sFinishHr == 1) {
		return  60 - sFinishMin + rFinishMin;
	} else {
		return rFinishMin - sFinishMin;
	}
}

/*determine whether the employee started on time or late*/
function getActualStart(rStart, sStart) {
	if (rStart >= sStart) {
		return "on time";
	} else {
		arrivedLate++;
		return "late";
	}
}

/*determine whether the employee left on time or early*/
function getActualFinish(rFinish, sFinish) {
	if (sFinish == "null") {
		return "no finish time clocked";
	} else if (sFinish >= rFinish) {
		return "on time";
	} else {
		leftEarly++;
		return  "left early ";
	} 
}

/*update the attendance form when the user click on the check button*/
function submitButtonListener(){
	submitButton.addEventListener("click", function(){
		var from = document.getElementsByTagName("input")[0];
		var to = document.getElementsByTagName("input")[1];
		var prefix = "http://localhost:4567/";
		var suffix = from.value + "/" + to.value;
		var shifts = JSON.parse(httpGet(prefix + "shifts/" + suffix));
		var rosters = JSON.parse(httpGet(prefix + "rosters/" + suffix));
		if (rosters.length > 0) {
			arrivedLate = 0;
			leftEarly = 0;
			var table = $('table').DataTable(); 
			table.clear();
			leftEarlyDates = [];
			processData(rosters, shifts);
		} else {
			alert("Attendance in this period is not found");
		}
	});
}