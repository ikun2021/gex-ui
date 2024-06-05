import request from '@/utils/request';

export const login = (data) => {
  return request({
    url: '/account/v1/login',
    method: 'post',
    data,
  })
}


export const getTickerList = (data) => {
  return request({
    url: '/quotes/v1/get_ticker_list',
    method: 'post',
    data,
  })
}

export const createOrder = (data) => {
  return request({
    url: '/order/v1/create_order',
    method: 'post',
    data,
  })
}

export const getOrderList = (data) => {
  return request({
    url: '/order/v1/get_order_list',
    method: 'post',
    data,
  })
}
export const getUserAssets = (data) => {
  return request({
    url: '/account/v1/get_user_asset_list',
    method: 'post',
    data,
  })
}


export const getDepthList = (data) => {
  return request({
    url: '/quotes/v1/get_depth_list',
    method: 'post',
    data,
  })
}


export const getKlineList = (data) => {
  return request({
    url: '/quotes/v1/get_kline_list',
    method: 'post',
    data,
  })
}


export const getTickList = (data) => {
  return request({
    url: '/quotes/v1/get_tick_list',
    method: 'post',
    data,
  })
}

export const cancelOrder = (data) => {
  return request({
    url: '/order/v1/cancel_order',
    method: 'post',
    data,
  })
}
export const addErrorCode = (data) => {
  return request({
    url: '/add_error_code',
    method: 'post',
    data,
  });
}
export const updateErrorCode = (data) => {
  return request({
    url: '/update_error_code',
    method: 'post',
    data,
  })
}

export const getCaptcha = (data) => {
  return request({
    url: '/account/v1/get_captcha',
    method: 'post',
    data,
  })
}
