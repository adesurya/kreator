// utils/formatters.js
const formatters = {
    currency: new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }),
  
    date: new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
  
    dateTime: new Intl.DateTimeFormat('id-ID', {
      year: 'numeric', 
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
  
  module.exports = formatters;