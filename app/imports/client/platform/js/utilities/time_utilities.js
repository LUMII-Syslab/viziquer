
function joined_date(date_obj) {
	if (date_obj) {
    date_obj = new Date(date_obj);
		var date = date_obj.getDate();
		var month_int = date_obj.getMonth() + 1;
		var year = date_obj.getFullYear();
		return date + "/" + month_int + "/" + year;
	}
	else {
		return "undefined";
	}
}

function months() {
	return ["January", 
          "February", 
          "March", 
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",                           
        ];
}

function time_interval_from_given_date(date, current_date) {

  if (!current_date)
    current_date = get_current_date();

  var diff = current_date - date;

  var diff_text = "";
  var mili_secs_in_minute = 60000;
  if (diff < mili_secs_in_minute) {
    //diff_text = "a few seconds ago";
    diff_text = {time: "seconds"};
  }
  else {
    var mili_secs_in_hour = mili_secs_in_minute * 60;
    if (diff < mili_secs_in_hour) {
      var res = Math.round(diff/mili_secs_in_minute);
      var tmp = "minutes";
      if (res == 1)
        tmp = "minute";
      //diff_text = res + " " + tmp + " ago";
      diff_text = {number: res, time: tmp};
    }
    else {
      var mili_secs_in_day = mili_secs_in_hour * 24;
      if (diff < mili_secs_in_day) {
        var res = Math.round(diff/mili_secs_in_hour);
        var tmp = "hours";
        if (res == 1)
          tmp = "hour";
        //diff_text = res + " " + tmp + " ago";
        diff_text = {number: res, time: tmp};
      }
      else {
        var mili_secs_in_month = mili_secs_in_day * 30;
        if (diff < mili_secs_in_month) {
          var res = Math.round(diff/mili_secs_in_day);
          var tmp = "days";
          if (res == 1)
            tmp = "day";
          //diff_text = res + " " + tmp + " ago";
          diff_text = {number: res, time: tmp};
        }
        else {
          var mili_secs_in_year = mili_secs_in_month * 12;
          if (diff < mili_secs_in_year) {
            var res = Math.round(diff/mili_secs_in_month);
            var tmp = "months";
            if (res == 1)
                tmp = "month";
            //diff_text = res + " " + tmp + " ago";
            diff_text = {number: res, time: tmp}; 
          }
        }
      }
    }
  }

  return diff_text;
}

function date_interval_in_mail_form(date, current_date) {
  if (!current_date)
    current_date = new Date;

  //current time
  var date_current_date = current_date.getDate();
  var month_current_date = current_date.getMonth();
  var year_current_date = current_date.getFullYear();

  //given time
  var date_date = date.getDate();
  var month_date = date.getMonth();
  var year_date = date.getFullYear();

//check if both time objects are in the same day
  if (date_current_date === date_date &&
    month_current_date === month_date &&
    year_current_date === year_date) {

  //calculates hour to be am or pm style
    var hour = date.getHours();
    var hour2 = hour;
    var clock = "am";
    if (hour2 > 12) {
      hour2 = hour2 - 12;
      clock = "pm";
    }

    var mins = date.getMinutes();
    if (mins < 10)
      mins = "0" + mins;

      //return hour + ":" + mins + " " + clock;
      return {type: "minutes" + clock, hour: hour, hour2: hour2, minutes: mins};
  }
  else {
    if (year_current_date === year_date) {
      var month = months()[month_date];
      month_date = month_date + 1;

      return {type: "month", month: month.substring(0,3),
              monthIndex: month_date, date: date_date, year: year_date};

      //return month.substring(0,3) + " " + date_date;
    }
    else {
      month_date = month_date + 1;
      return {type: "year", month: month.substring(0,3),
              monthIndex: month_date, date: date_date, year: year_date};

      //return month_date + "/" + date_date + "/" + year_date.substring(2,4);
    }
  }
}

function get_time_in_miliseconds() {
  var date = new Date();
  return date.getTime();
}

function get_current_time() {
  return new Date();
}

function get_current_date() {
  return new Date;
}

export {
  joined_date,
}
