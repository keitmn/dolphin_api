const puppeteer = require('puppeteer-core')
const axios = require('axios')
const config = require('config')

const username = config.get('username')
const password = config.get('password')

/**
 * Авторизация. Отправляем логин и пароль,
 * в ответ получаем токен и возвращаем его
 * @returns token
 */
const auth = async () => {
    const options = {
        method: "post",
        url: "https://anty-api.com/auth/login",
        data: {
            username, password
        }
    }
    const response = await axios(options)

    if (response.data.token)
        return response.data.token
    return false
}

/**
 * Получаем список профилей. На входе токен,
 * на выходе массив id профилей
 * @param token
 * @returns {Promise<boolean|*>}
 */
const getProfiles = async token => {
    const options = {
        url: "https://anty-api.com/browser_profiles",
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
    const {data} = await axios(options)

    if (data && data.data.length > 0) {
        const ids = data.data.map(el => el.id)
        return ids
    }
    return false
}

/**
 * Открываем Anty Dolphin. На входе id профиля,
 * на выходе данные для подключения к инстансу
 * @param profileId
 * @returns {Promise<*>}
 */
const openBrowser = async profileId => {
    const {data} = await axios(`http://localhost:3001/v1.0/browser_profiles/${profileId}/start?automation=1`)
    return data.automation
}

/**
 * Функция автоматизации. Запускает инстанс браузера,
 * после открывает страницу гугла и делает скнишот.
 * На входе id профиля.
 * @param profileId
 * @returns {Promise<void>}
 */
const automation = async profileId => {
    const {port, wsEndpoint} = await openBrowser(profileId)

    const browser = await puppeteer.connect({
        browserWSEndpoint: `ws://127.0.0.1:${port}${wsEndpoint}`
    });

    const page = await browser.newPage();
    await page.goto('https://google.com');
    await page.screenshot({ path: 'google.png' });

    await browser.close()
}

/**
 * Стартовая функция. Поэтапно:
 * 1. Запрашивает токен
 * 2. Получает список айдишников
 * 3. Обходит циклом, запуская функцию автоматизации
 */
(async _ => {
    const token = await auth()
    if (!token) {
        console.log('Токен не получен')
        return
    }
    const profilesIds = await getProfiles(token)
    if (!profilesIds) {
        console.log('Профили отсутствуют')
        return
    }

    for(let i = 0; i < profilesIds.lengtn; i++) {
        automation(profilesIds[i])
    }
})()