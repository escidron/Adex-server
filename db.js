// const mysql = require('mysql2');
import mysql from 'mysql2'
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'adax',
    password:'Eduardo1993*'
  });

  connection.connect(function(err){
    if(err){
        console.log(err)
    }else{
        console.log('success')
    }

});
export default connection