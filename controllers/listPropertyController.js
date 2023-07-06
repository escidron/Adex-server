import asyncHandler from 'express-async-handler';
import database from '.././db.js'

const getListPropertyRoutes = asyncHandler(async (req, res) => {

    const sql = `SELECT * FROM adax.categories;`;
    database.query(sql,  (err, result) => {
        if (err) throw err;
        if (result.length == 0) {
          res.status(401).json({
            error:'List properties does not exists'
          })
        }else{
            res.status(200).json({
              data: result
          })  
        }
    })
});

export {

    getListPropertyRoutes
};