const express = require('express');
const asyncHandler = require('express-async-handler');
const {validationResult } = require('express-validator')
const {Op} = require('sequelize')

const {Holding, Ticker} = require('../../db/models')
const UserFuncs = require('../utils/user-functions')
const {userAuth, userCreateAuth} = require('./validators/user-auth-middleware')

const { authenticated, generateToken } = require('../utils/utils');
const {Ledger} = require('../../db/models/');

const router = express.Router();

  router.post('/', userAuth, userCreateAuth, asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
      return next({ status: 422, errors: errors.array() });
    }

    try {
      const user = await UserFuncs.create(req.body);
      const { jwtid, token } = generateToken(user);
      user.tokenId = jwtid;
      await user.save();

      await Ledger.create({
        userId: user.id,
        tickerId: 1,
        price: 1,
        amount: 1000,
        tradeTotal: 1000,
        isOpen: false,
      })

      await Holding.create({
        userId: user.id,
        tickerId: 1,
        type: 'CASH',
        amount: 1000,
        positionCost: 1000,
        positionValue: 1000
      })
      res.json({ token, user: user.toSafeObject() });
    } catch (e){
      next(e);
    }
  }));



  router.get('/portfolio', authenticated, async(req, res, next) => {
    const portfolio = await Ledger.findAll({
      where: { 
        userId: req.user.id,
        [Op.or]: [{isOpen: true}, {tickerId: 1}]
       },
      attributes: ['amount', 'tradeTotal'],
      include: {
        model: Ticker,
        attributes: ['ticker']
      }
    });
    console.log(portfolio)
    if(portfolio){
      res.json({
        portfolio
      })
    };

    next('err')
  });

  router.get('/portfolio/history', authenticated, async(req,res,next) => {

    let portfolio
    try {

      portfolio = await Ledger.findAll({where: {userId: req.user.id, tickerId: 2}, order: [['updatedAt', 'ASC']]});
    } catch (e){
      next('Error in data retrieval')
    }

    if(portfolio){
      res.json({
        portfolio
      })
    }
    next('err')
  })

  router.get('/', authenticated, (req, res) => {
    res.json({
      email: req.user.email,
      username: req.user.username,
    })
  })

  router.get('/cash', authenticated, asyncHandler(async (req, res, next) => {
    const cash = await await Holding.findOne({
      where: {userId: req.user.id, type: 'CASH'}
    });

    if(cash){
      res.json(
        cash
      )
    }

    next('err');
  }))
  module.exports = router;
