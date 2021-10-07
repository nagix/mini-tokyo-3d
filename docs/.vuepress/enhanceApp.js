function getElementPosition(el) {
  const docEl = document.documentElement;
  const docRect = docEl.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  return {
    x: elRect.left - docRect.left,
    y: elRect.top - docRect.top
  };
}

function getElement(to) {
  const targetAnchor = to.hash.slice(1);  
  return document.getElementById(targetAnchor) || document.querySelector(`[name='${targetAnchor}']`);
}

function scrollToAnchor(to) {
  const targetElement = getElement(to);

  if (targetElement) {
    return window.scrollTo({
      top: getElementPosition(targetElement).y,
      behavior: 'smooth'
    });
  }
}

export default ({
  Vue,
  options,
  router,
  siteData,
  isServer
}) => {
  // Workaround of vuepress #1499
  router.options.scrollBehavior = (to, from, savedPosition) => {
    if (savedPosition) {
      return window.scrollTo({
        top: savedPosition.y,
        behavior: 'smooth'
      });
    } else if (to.hash) {
      if (Vue.$vuepress.$get('disableScrollBehavior')) {
        return false;
      }
      new Promise((resolve, reject) => {
        if (getElement(to)) {
          resolve();
        } else {
          const timeout = Date.now() + 10000;
          const timer = window.setInterval(() => {
            if (getElement(to)) {
              resolve();
              window.clearInterval(timeout);
            } else if (Date.now() > timeout) {
              reject();
            }
          }, 100);
        }
      }).then(() => {
        const promises = [];
        document.querySelectorAll('img').forEach(image => {
          if (!image.complete) {
            promises.push(new Promise(resolve => {
              image.onload = resolve;
            }));
          }
        });
        Promise.all(promises).then(() => {
          scrollToAnchor(to);
        });
      });
    } else {
      return window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
}
