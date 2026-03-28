(function() {
  if (!sessionStorage.getItem('auth')) {
    location.replace('/login.html');
  }
})();
