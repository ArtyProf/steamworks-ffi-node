# Security Policy

## Supported Versions

We recommend always using the latest version to ensure you have the most recent security patches.

## Reporting a Vulnerability

We take the security of steamworks-ffi-node seriously. If you discover a security vulnerability, please follow these guidelines:

### Where to Report

**Please DO NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by:

1. **GitHub Security Advisories** (Preferred)
   - Go to the [Security tab](https://github.com/ArtyProf/steamworks-ffi-node/security/advisories) of this repository
   - Click "New draft security advisory"
   - Fill out the form with details

2. **Private Email**
   - Send an email to the project maintainer - arty4prof@gmail.com
   - Include "SECURITY" in the subject line
   - Provide detailed information about the vulnerability

### What to Include

Please include the following information in your report:

- **Type of vulnerability** (e.g., buffer overflow, injection, memory leak)
- **Full paths of source file(s)** related to the vulnerability
- **Location of the affected source code** (tag/branch/commit or direct URL)
- **Step-by-step instructions to reproduce** the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the vulnerability** and how it might be exploited
- **Any potential mitigations** you've identified

### Response Timeline

- **Initial Response**: Within 48 hours of receiving your report
- **Status Update**: We will provide a detailed response within 7 days, including:
  - Confirmation of the issue
  - Our assessment of severity
  - Planned remediation timeline
- **Resolution**: Critical vulnerabilities will be addressed in an emergency patch within 7-14 days
- **Public Disclosure**: After a fix is available, we will coordinate disclosure timing with you

## Security Considerations

### Native Code & Memory Safety

This project uses native C++ bindings to interface with the Steamworks SDK. Key security considerations:

- **Memory Management**: Improper memory handling in native modules can lead to crashes or exploits
- **Buffer Overflows**: Input validation is critical when passing data between JavaScript and native code
- **Type Safety**: Always use TypeScript types to catch potential issues at compile time

### Steamworks SDK Security

- **SDK Updates**: We aim to support the latest Steamworks SDK releases to include security patches
- **API Key Protection**: Never commit Steam API keys, App IDs, or sensitive credentials to the repository
- **Steam Authentication**: This library does not handle Steam authentication tokens directly - that's managed by the Steam client

### Dependency Security

- We regularly update dependencies to patch known vulnerabilities
- Use `npm audit` to check for vulnerabilities in your project
- Consider using tools like Dependabot or Snyk for automated vulnerability scanning

## Security Best Practices for Users

### When Using steamworks-ffi-node

1. **Keep Updated**: Always use the latest version of this library
2. **Input Validation**: Validate all user input before passing to Steam API functions
3. **Error Handling**: Implement proper error handling to avoid exposing sensitive information
4. **Steam Client Required**: This library requires the Steam client - ensure it's from official sources
5. **Sandboxing**: Consider running your application in a sandboxed environment during development

### Code Signing

For production applications:
- Sign your application binaries (Windows, macOS, Linux)
- Use notarization for macOS applications
- This helps prevent tampering and builds user trust

## Known Security Limitations

### Native Module Risks

- **Crash Potential**: Invalid parameters to native functions can crash the Node.js process
- **No Sandbox**: Native modules run with full system privileges
- **DLL/Dylib Injection**: The Steamworks SDK loads native libraries that could be targeted

### Steam Client Dependency

- This library requires the Steam client to be running
- Security depends on the Steam client's integrity
- We cannot control or patch vulnerabilities in the Steam client itself

## Security Updates

Security updates will be released as:

- **Patch versions** (0.7.x) for minor security fixes
- **Minor versions** (0.x.0) for moderate security issues
- **Emergency patches** with clear security advisories for critical vulnerabilities

Subscribe to GitHub releases or watch the repository to stay informed about security updates.

## Acknowledgments

We appreciate the security research community and will acknowledge researchers who responsibly disclose vulnerabilities (with their permission) in our security advisories and release notes.

## Questions

If you have questions about this security policy or general security concerns, please open a discussion in the GitHub Discussions tab rather than a public issue.

---

**Last Updated**: January 2, 2026
