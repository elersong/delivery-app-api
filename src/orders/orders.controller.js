const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// helper fxns -------------------------------------------------------------------

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

const isValidQuantity = (quant) => {
  return (quant && Number.isInteger(quant) && (quant > 0));
}

const isValidMobile = (mobile) => {
  return (mobile && (mobile.length > 0));
}

const isValidDeliver = (deliver) => {
  return (deliver && (deliver.length > 0));
}

const isValidDishesProperty = (dishes) => {
  if (dishes && Array.isArray(dishes) && (dishes.length > 0)) {
    return dishes.every(dish => isValidQuantity(dish.quantity))
  };
}

// validation fxns ---------------------------------------------------------------

const orderExists = (req, res, next) => {
  const {orderId} = req.params;
  const foundOrder = orders.find((order) => order.id == orderId);
  res.locals.foundOrder = foundOrder;

  if (foundOrder) {
    return next();
  } else {
    next({
      status: 404,
      message: `Order does not exist: ${orderId}`
    });
  }
}

const orderIsPending = (req, res, next) => {
  if (res.locals.foundOrder.status == 'pending') {
    next();
  } else {
    next({
      status: 400,
      message: `Can only delete orders while status is 'pending'.`
    });
  }
}

const isValidNewOrder = (req, res, next) => {
  let {data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  res.locals.newOrderData = { deliverTo, mobileNumber, dishes };

  if (isValidDeliver(deliverTo) && isValidMobile(mobileNumber) && isValidDishesProperty(dishes)) {
    return next();
  } else {
    next({
      status: 400,
      message: `All new orders must have properties: dishes, quantity, mobileNumber, deliverTo. Submitted data: ${JSON.stringify(res.locals.newOrderData)}`
    });
  }
}

const isValidForUpdate = (req, res, next) => {
  const { orderId } = req.params;
  const { data: {id, status } = {} } = req.body;
  let errorMessage, errorStatus;

  switch (true) {
    case (id && id !== orderId):
      errorStatus = 400;
      errorMessage = `Order id does not match route id. Order: ${id}, Route: ${orderId}.`
      break;
    case (!status):
    case (!['pending', 'preparing', 'out-for-delivery', 'delivered'].includes(status)):
      errorStatus = 400;
      errorMessage = 'Order must have a status of pending, preparing, out-for-delivery, delivered'
      break;
    case (status == "delivered"):
      errorMessage = 'A delivered order cannot be changed';
      errorStatus = 400;
    default:
      errorMessage = undefined;
      break;
  }

  if (!errorMessage) {
    next();
  } else {
    next({
      status: errorStatus || 404,
      message: errorMessage
    });
  }
}

// route handler fxns ------------------------------------------------------------

// GET /orders
const list = (req, res) => {
  res.json({data: orders})
}

// GET /orders/:orderId
const read = (req, res) => {
  res.json({data: res.locals.foundOrder})
}

// POST /orders
const create = (req, res) => {
  let newOrder = {
    ...res.locals.newOrderData,
    id: nextId()
  }
  orders.push(newOrder)
  res.status(201).json({data: newOrder});
}

// PUT /orders/:orderId
const update = (req, res) => {
  const orderId = res.locals.foundOrder.id;
  const orderIndex = orders.findIndex(order => order.id == orderId);

  let updatedOrder = {
    id: orderId,
    status: req.body.data.status,
    ...res.locals.newOrderData
  }
  orders[orderIndex] = updatedOrder;

  res.json({data: updatedOrder});
}

// DELETE /orders/:orderId
const destroy = (req, res) => {
  const orderId = res.locals.foundOrder.id;
  const orderIndex = orders.findIndex(order => order.id == orderId);
  orders.splice(orderIndex,1);
  res.sendStatus(204);
}

module.exports = {
  list,
  read: [orderExists, read],
  create: [isValidNewOrder, create],
  update: [orderExists, isValidForUpdate, isValidNewOrder, update],
  delete: [orderExists, orderIsPending, destroy]
}