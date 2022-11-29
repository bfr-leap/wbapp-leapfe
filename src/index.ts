function component() {
    const element = document.createElement('div');

    element.innerHTML = ['Hello!', 'webpack'].join(' ');

    fetch('./data/lapchart_sessionId_192046751_subSessionId_52396226.json')
        .then((response) => {
            return response.json();
        })
        .then((jsondata) => console.log(jsondata));

    return element;
}

document.body.appendChild(component());
