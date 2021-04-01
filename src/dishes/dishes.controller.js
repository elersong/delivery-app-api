const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// helper fxns -------------------------------------------------------------------

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// validation fxns ---------------------------------------------------------------

const dishIsOnTheMenu = (req, res, next) => {
  const {dishId} = req.params;
  const foundDish = dishes.find((dish) => dish.id == dishId);
  res.locals.foundDish = foundDish;

  if (foundDish) {
    next();
  } else {
    next({
      status: 404,
      message: `Dish does not exist: ${dishId}`
    });
  }
}

const isValidNewDish = (req, res, next) => {
  let {data: { name, description, price, image_url } = {} } = req.body;
  res.locals.newDishData = { name, description, price, image_url };

  if (name && description && price && image_url && (price > 0) && (price === +price)) {
    next();
  } else {
    next({
      status: 400,
      message: 'All new dishes must have properties: name, description, price, image_url'
    });
  }
}

const hasCorrectIdentifier = (req, res, next) => {
  const { dishId } = req.params;
  const { data: {id} = {} } = req.body;

  if (!id || id === dishId) {
    next();
  } else {
    next({
      status: 400,
      message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}`
    });
  }
}

// route handler fxns ------------------------------------------------------------

// GET /dishes
const list = (req, res) => {
  res.json({data: dishes})
}

// GET /dishes/:dishId
const read = (req, res) => {
  res.json({data: res.locals.foundDish})
}

// POST /dishes
const create = (req, res) => {
  let newDish = {
    ...res.locals.newDishData,
    id: nextId()
  }
  dishes.push(newDish)
  res.status(201).json({data: newDish});
}

// PUT /dishes/:dishId
const update = (req, res) => {
  const dishId = res.locals.foundDish.id;
  const dishIndex = dishes.findIndex(dish => dish.id == dishId);

  let updatedDish = {
    id: dishId,
    ...res.locals.newDishData
  }
  dishes[dishIndex] = updatedDish;

  res.json({data: updatedDish});
}

module.exports = {
  list,
  read: [dishIsOnTheMenu, read],
  create: [isValidNewDish, create],
  update: [dishIsOnTheMenu, hasCorrectIdentifier, isValidNewDish, update],
}