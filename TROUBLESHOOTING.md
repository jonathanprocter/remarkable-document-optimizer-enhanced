# Troubleshooting Guide - reMarkable Document Optimizer

**Version:** 1.2.0  
**Last Updated:** October 27, 2025

---

## Table of Contents

1. [Deployment Issues](#deployment-issues)
2. [Application Not Loading](#application-not-loading)
3. [File Upload Problems](#file-upload-problems)
4. [Processing Errors](#processing-errors)
5. [Display Issues](#display-issues)
6. [Browser Compatibility](#browser-compatibility)
7. [Performance Issues](#performance-issues)
8. [Security and HTTPS](#security-and-https)
9. [Platform-Specific Issues](#platform-specific-issues)
10. [Debug Tools](#debug-tools)

---

## Deployment Issues

### Issue: Site Shows 404 Error

**Symptoms:**
- Page not found error
- Blank page with 404 message

**Solutions:**

1. **Verify index.html location**
   ```
   ✓ index.html must be in the root directory
   ✗ Do not place in subdirectories
   ```

2. **Check deployment path**
   - GitHub Pages: Verify branch and folder settings
   - Netlify: Ensure publish directory is set to `.` or root
   - Vercel: Check root directory configuration

3. **Wait for deployment**
   - GitHub Pages: 1-2 minutes
   - Netlify: 30-60 seconds
   - Vercel: 30-60 seconds

4. **Clear browser cache**
   - Press Ctrl+F5 (Windows/Linux) or Cmd+Shift+R (Mac)
   - Try incognito/private browsing mode

### Issue: CSS Not Loading (Unstyled Page)

**Symptoms:**
- Plain HTML with no styling
- Text appears but no colors or layout

**Solutions:**

1. **Check file paths**
   ```html
   ✓ Correct: <link rel="stylesheet" href="css/main.css">
   ✗ Wrong: <link rel="stylesheet" href="/css/main.css">
   ✗ Wrong: <link rel="stylesheet" href="http://localhost/css/main.css">
   ```

2. **Verify CSS files uploaded**
   - Check that `css/` folder exists
   - Verify `main.css` and `components.css` are present
   - File names are case-sensitive on some platforms

3. **Check browser console**
   - Press F12 to open DevTools
   - Look for 404 errors in Console tab
   - Check Network tab for failed requests

4. **Verify deployment structure**
   ```
   deployment/
   ├── index.html
   ├── css/
   │   ├── main.css
   │   └── components.css
   └── js/
       └── ...
   ```

### Issue: JavaScript Not Working

**Symptoms:**
- Buttons don't respond
- File upload doesn't work
- Console shows errors

**Solutions:**

1. **Check JavaScript files**
   - Verify all 6 JS files are uploaded
   - Check file paths are relative
   - Ensure files are in `js/` folder

2. **Check CDN libraries**
   - Open browser console (F12)
   - Look for CDN loading errors
   - Verify internet connection
   - Check if CDN URLs are accessible

3. **Verify script order**
   - CDN libraries must load before app scripts
   - Check `index.html` script order matches:
     1. CDN libraries (jsPDF, PDF.js, etc.)
     2. utils.js
     3. documentParser.js
     4. pdfOptimizer.js
     5. fileHandler.js
     6. previewRenderer.js
     7. app.js

4. **Check for JavaScript errors**
   - Open Console tab in DevTools
   - Look for red error messages
   - Note the file and line number

---

## Application Not Loading

### Issue: Blank White Page

**Symptoms:**
- Completely blank page
- No content visible
- No errors in console

**Solutions:**

1. **Check browser console**
   ```
   Press F12 → Console tab
   Look for JavaScript errors
   ```

2. **Verify HTML file**
   - Ensure `index.html` is not corrupted
   - Check file size (should be ~6KB)
   - Verify DOCTYPE is present

3. **Check network requests**
   - Open Network tab in DevTools
   - Reload page
   - Verify all files load (status 200)

4. **Try different browser**
   - Test in Chrome, Firefox, or Safari
   - Disable browser extensions
   - Try incognito/private mode

### Issue: Page Loads But Shows Errors

**Symptoms:**
- Page partially loads
- Error messages visible
- Some features don't work

**Solutions:**

1. **Check CDN availability**
   - Verify internet connection
   - Test CDN URLs directly in browser:
     - https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
     - https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js
     - (and others listed in index.html)

2. **Check browser compatibility**
   - Use modern browser (Chrome 90+, Firefox 88+, Safari 14+)
   - Enable JavaScript
   - Check browser console for specific errors

3. **Verify all files present**
   - Use deployment checklist
   - Ensure no files are missing
   - Check file permissions (if applicable)

---

## File Upload Problems

### Issue: File Upload Not Working

**Symptoms:**
- Click on upload area does nothing
- Drag and drop doesn't work
- No file selection dialog

**Solutions:**

1. **Check browser permissions**
   - Ensure JavaScript is enabled
   - Check if browser blocks file access
   - Try different browser

2. **Verify file input element**
   - Check browser console for errors
   - Ensure fileHandler.js loaded correctly
   - Verify app.js initialized properly

3. **Check file size**
   - Browser memory limits apply
   - Try smaller file first (<5MB)
   - Large files may cause issues

4. **Supported formats**
   - Verify file format is supported:
     - PDF, DOCX, DOC, MD, CSV, XLSX, XLS, PPT, PPTX, EPUB
   - Check file extension matches format

### Issue: File Uploads But Nothing Happens

**Symptoms:**
- File selected successfully
- No processing starts
- No error messages

**Solutions:**

1. **Check browser console**
   - Look for JavaScript errors
   - Check for CDN library errors
   - Verify all dependencies loaded

2. **Verify file format**
   - Ensure file is not corrupted
   - Try different file
   - Check file extension is correct

3. **Check file size**
   - Very large files may take time
   - Browser may run out of memory
   - Try smaller file (<10MB)

4. **Clear browser cache**
   - Reload page with Ctrl+F5
   - Clear browser cache completely
   - Try incognito mode

---

## Processing Errors

### Issue: "Processing Failed" Error

**Symptoms:**
- Error message during processing
- Processing stops midway
- Console shows errors

**Solutions:**

1. **Check file format**
   - Verify file is not corrupted
   - Ensure format is supported
   - Try converting file to different format

2. **Check file content**
   - Some complex documents may fail
   - Try simpler document first
   - Check for password protection

3. **Browser memory**
   - Close other tabs
   - Restart browser
   - Try smaller file

4. **Check console for details**
   - Open DevTools Console
   - Look for specific error message
   - Note which library is failing

### Issue: Blank PDF Generated

**Symptoms:**
- Processing completes
- Downloaded PDF is blank
- No content visible

**Solutions:**

1. **Check source document**
   - Verify source has content
   - Try different document
   - Check if source opens correctly

2. **Browser compatibility**
   - Update browser to latest version
   - Try different browser
   - Check console for errors

3. **Memory issues**
   - Try smaller document
   - Close other tabs
   - Restart browser

4. **Check PDF viewer**
   - Try different PDF viewer
   - Download and open in Adobe Reader
   - Check if PDF is actually empty

---

## Display Issues

### Issue: Layout Broken on Mobile

**Symptoms:**
- Elements overlap
- Text too small
- Buttons not clickable

**Solutions:**

1. **Check viewport meta tag**
   - Should be present in index.html
   - Already included: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`

2. **Verify CSS loaded**
   - Check that both CSS files load
   - Look for 404 errors in console
   - Test on different mobile browser

3. **Clear mobile browser cache**
   - Clear cache in browser settings
   - Try private/incognito mode
   - Restart browser app

### Issue: Fonts Look Wrong

**Symptoms:**
- Text appears in wrong font
- Fonts not rendering correctly
- Missing characters

**Solutions:**

1. **Check CSS loading**
   - Verify CSS files loaded
   - Check browser console
   - Clear cache and reload

2. **Browser font support**
   - Some browsers may render fonts differently
   - This is normal variation
   - Core functionality not affected

---

## Browser Compatibility

### Issue: Not Working in Older Browser

**Symptoms:**
- Page doesn't load
- Features don't work
- Console shows syntax errors

**Solutions:**

1. **Update browser**
   - Use latest version of:
     - Chrome 90+
     - Firefox 88+
     - Safari 14+
     - Edge 90+

2. **Check JavaScript support**
   - Requires ES6 support
   - Older browsers not supported
   - Use modern browser

3. **Enable JavaScript**
   - Check browser settings
   - Ensure JavaScript is enabled
   - Disable script blockers

### Issue: Not Working in Internet Explorer

**Symptoms:**
- Page doesn't load in IE
- Errors about unsupported features

**Solutions:**

1. **Use modern browser**
   - Internet Explorer is not supported
   - Use Edge, Chrome, Firefox, or Safari
   - IE lacks required ES6 features

---

## Performance Issues

### Issue: Slow Processing

**Symptoms:**
- Processing takes very long
- Browser becomes unresponsive
- Page freezes

**Solutions:**

1. **File size**
   - Large files take longer
   - Try smaller file first
   - Recommended: <20MB

2. **Browser resources**
   - Close other tabs
   - Close other applications
   - Restart browser

3. **Device performance**
   - Older devices may be slower
   - This is normal for large files
   - Wait for processing to complete

4. **Check progress**
   - Look at progress bar
   - Check debug console
   - Processing may still be working

### Issue: Page Loads Slowly

**Symptoms:**
- Initial page load is slow
- CDN libraries take time
- Delayed interactivity

**Solutions:**

1. **Internet connection**
   - Check connection speed
   - CDN libraries need to download
   - First load always slower

2. **Browser cache**
   - Subsequent loads will be faster
   - CDN libraries are cached
   - Normal behavior

3. **Platform CDN**
   - GitHub Pages/Netlify/Vercel use CDN
   - Geographic location affects speed
   - Generally fast worldwide

---

## Security and HTTPS

### Issue: Mixed Content Warning

**Symptoms:**
- Browser shows "not secure" warning
- Some resources blocked
- Console shows mixed content errors

**Solutions:**

1. **Verify HTTPS**
   - All CDN links use HTTPS (already configured)
   - Hosting platform should provide HTTPS
   - Check URL starts with https://

2. **Platform HTTPS**
   - GitHub Pages: Automatic HTTPS
   - Netlify: Automatic HTTPS
   - Vercel: Automatic HTTPS
   - Wait for SSL certificate provisioning

3. **Custom domain**
   - If using custom domain, verify SSL
   - Check DNS configuration
   - Wait for certificate provisioning (up to 24 hours)

### Issue: Security Headers Not Applied

**Symptoms:**
- Security scan shows missing headers
- Headers not visible in Network tab

**Solutions:**

1. **Verify configuration files**
   - GitHub Pages: `.nojekyll` present
   - Netlify: `netlify.toml` present
   - Vercel: `vercel.json` present

2. **Check platform support**
   - GitHub Pages: Limited header support
   - Netlify: Full header support via netlify.toml
   - Vercel: Full header support via vercel.json

3. **Redeploy**
   - Configuration files must be in root
   - Redeploy after adding config files
   - Wait for deployment to complete

---

## Platform-Specific Issues

### GitHub Pages Issues

**Issue: Jekyll processing files**

**Solution:**
- Ensure `.nojekyll` file is present in root
- File should be empty
- Redeploy if missing

**Issue: Site not updating**

**Solution:**
- Wait 1-2 minutes after push
- Clear browser cache
- Check GitHub Actions status
- Verify branch is correct in settings

### Netlify Issues

**Issue: Drag-and-drop not working**

**Solution:**
- Try different browser
- Ensure folder (not zip) is dragged
- Use manual upload option
- Try Netlify CLI

**Issue: Headers not applied**

**Solution:**
- Verify `netlify.toml` in root
- Check TOML syntax
- Redeploy site
- Check deploy log for errors

### Vercel Issues

**Issue: Git integration not working**

**Solution:**
- Reconnect Git repository
- Check webhook configuration
- Verify branch name
- Try manual deployment

**Issue: Build failing**

**Solution:**
- No build needed for static site
- Leave build command empty
- Check project settings
- Review deployment logs

---

## Debug Tools

### Browser Developer Tools

**Open DevTools:**
- Windows/Linux: F12 or Ctrl+Shift+I
- Mac: Cmd+Option+I

**Key Tabs:**

1. **Console**
   - Shows JavaScript errors
   - Displays debug messages
   - Shows CDN loading status

2. **Network**
   - Shows all file requests
   - Displays HTTP status codes
   - Shows loading times

3. **Application/Storage**
   - Shows local storage
   - Displays cache status
   - Shows service workers

### Application Debug Console

The app includes a built-in debug console:

1. **Access Debug Console**
   - Scroll to bottom of page
   - Click "🔍 Debug Console"
   - Expands to show debug messages

2. **Debug Information**
   - File upload events
   - Processing steps
   - Error messages
   - Performance metrics

3. **Clear Debug Log**
   - Click "Clear" button
   - Refreshes debug console
   - Useful for new tests

### Testing Checklist

When troubleshooting:

- [ ] Check browser console for errors
- [ ] Verify all files loaded (Network tab)
- [ ] Test in different browser
- [ ] Try incognito/private mode
- [ ] Clear browser cache
- [ ] Check internet connection
- [ ] Verify file format supported
- [ ] Try smaller test file
- [ ] Check debug console in app
- [ ] Review deployment logs

---

## Getting Help

### Before Asking for Help

1. **Check this guide** - Most issues covered here
2. **Check browser console** - Look for specific errors
3. **Try different browser** - Isolate browser-specific issues
4. **Review deployment guide** - Verify correct setup
5. **Check verification report** - Ensure all tests passed

### Information to Provide

When reporting issues:

- Browser name and version
- Operating system
- Deployment platform
- Specific error messages
- Steps to reproduce
- Screenshots (if applicable)
- Browser console output

### Resources

- **Deployment Guides** - Platform-specific instructions
- **README.md** - User documentation
- **DEPLOYMENT_CHECKLIST.md** - Verification steps
- **Platform Documentation** - GitHub Pages, Netlify, Vercel docs

---

## Common Error Messages

### "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT"

**Cause:** Ad blocker or privacy extension blocking CDN  
**Solution:** Disable ad blocker for this site or whitelist CDN domains

### "Uncaught ReferenceError: [library] is not defined"

**Cause:** CDN library failed to load  
**Solution:** Check internet connection, verify CDN URLs, check console for loading errors

### "Cannot read property of undefined"

**Cause:** JavaScript error, usually missing dependency  
**Solution:** Check all JS files loaded, verify script order, check console for details

### "QuotaExceededError"

**Cause:** Browser storage limit exceeded  
**Solution:** Clear browser cache, close other tabs, try smaller file

### "SecurityError: Blocked a frame with origin"

**Cause:** CORS or security policy issue  
**Solution:** Ensure HTTPS, check security headers, verify CDN accessibility

---

## Prevention Tips

### Best Practices

1. **Always use HTTPS** - Hosting platforms provide this automatically
2. **Test before deploying** - Use verification checklist
3. **Keep files organized** - Maintain proper directory structure
4. **Use relative paths** - Never use absolute paths for local files
5. **Test in multiple browsers** - Ensure compatibility
6. **Monitor console** - Check for warnings during development
7. **Keep documentation handy** - Reference guides when needed

### Regular Maintenance

1. **Check CDN libraries** - Verify accessibility periodically
2. **Test functionality** - Upload test files regularly
3. **Monitor performance** - Check loading times
4. **Review logs** - Check platform deployment logs
5. **Update documentation** - Keep guides current

---

**Last Updated:** October 27, 2025  
**Version:** 1.2.0  
**Status:** Comprehensive troubleshooting guide

*For additional support, refer to platform-specific documentation and deployment guides.*
