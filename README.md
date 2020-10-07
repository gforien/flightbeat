# leader-election :computer::policeman::globe_with_meridians:

![](https://img.shields.io/badge/5TC-ELK-blueviolet)
![](https://img.shields.io/badge/license-The%20Unlicense-ff69b4)

#### Here is a simple description of what it does
<!--- Here are technologies used
<p style = text-align:center;>
    <img  src="https://upload.wikimedia.org/wikipedia/fr/3/38/Guitar_Hero_Logo.png" alt="Guitar Hero" height="145" width="199">
    <img src="https://www.neonmag.fr/content/uploads/2019/04/color-spotify-logo.jpg" alt="Spotify" height="145" width="214">
    <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Osu_new_logo.png" alt="Osu" height="145" width="145">
</p>
Or more simply, a GIF of the app functionning
![](screenshot.gif)
--->

## :construction_worker: Building and launching
```bash
$ npm install
$ npm start
```

## :rocket: Rocket
```ps1
> 1..9 | ${ ssh tc0$_ '(crontab -l 2>/dev/null; echo "*/5 * * * * node ~/leader-election/leader.js $_") | crontab -' }
> 10..16 | ${ ssh tc$_ '(crontab -l 2>/dev/null; echo "*/5 * * * * node ~/leader-election/leader.js $_") | crontab -' }
```

## :books: Sources
This project is sampled from :
- [npm got](https://www.npmjs.com/package/got)

##
#### [Gabriel FORIEN](https://github.com/gforien)
![](https://upload.wikimedia.org/wikipedia/commons/b/b9/Logo_INSA_Lyon_%282014%29.svg)
