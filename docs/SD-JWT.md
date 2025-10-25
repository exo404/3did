# Fix SDR package
Using *yarn* to add the SD-JWT package isn't an option since public package misses some files. The only option is to clone the public repository and link it to the project: 
 
```bash
git clone https://github.com/Eengineer1/sd-jwt-veramo
cd sd-jwt-veramo
yarn install
```
Then you have to change the *assert* keyword in the CredentialSDJwt.ts to *with* (latest Node versions deprecated using that keyword)

```bash
yarn build      
yarn link        
cd /home/exo404/3did
yarn link @eengineer1/veramo-credential-sd-jwt
```

