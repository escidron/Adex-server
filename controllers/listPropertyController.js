import asyncHandler from 'express-async-handler';
import getDatabaseConnection from ".././db.js";

const db = getDatabaseConnection();

const getListPropertyRoutes = asyncHandler(async (req, res) => {

    const sql = `SELECT * FROM adex.categories;`;
    db.query(sql,  (err, result) => {
        if (err) throw err;
        if (result.length == 0) {
          res.status(401).json({
            error:'List properties does not exists'
          })
        }else{
            res.status(200).json(result)  
        }
    })
});

export {

    getListPropertyRoutes
};