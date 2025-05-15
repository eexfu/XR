export default class XRUtil {
    static isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
  
    static isIOS() {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }
  
    static isIFrame() {
      return window.self !== window.top;
    }
  
    static isXRSupported() {
      return 'xr' in navigator;
    }
  
    static async checkXRSupport() {
      if (!this.isXRSupported()) {
        return false;
      }
      try {
        return await navigator.xr.isSessionSupported('immersive-vr');
      } catch (error) {
        console.warn('XR support check failed:', error);
        return false;
      }
    }
  
    static getQueryParameter(name) {
      const url = window.location.href;
      name = name.replace(/[[\]]/g, '\\$&');
      const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
      const results = regex.exec(url);
      if (!results) return null;
      if (!results[2]) return '';
      return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }
  
    static appendQueryParameter(url, key, value) {
      const separator = url.indexOf('?') !== -1 ? '&' : '?';
      return url + separator + key + '=' + value;
    }
  }