const input = document.getElementById('skill-input');
const addBttn = document.getElementById('addSkillBtn');
const list = document.getElementById('skills-list');

// Always start from the skills written in the HTML. Adding and removing is a demo:
// changes only last until the page is reloaded, so every visitor sees the real list
let skills = [...list.querySelectorAll('li')].map(li => li.textContent.trim());

// An earlier version saved the list in the browser, so clear any old copy
try {
    localStorage.removeItem('skills');
} catch {
    // storage is blocked, so nothing was saved there anyway
}

function render() {
    list.innerHTML = '';
    skills.forEach((skill, index) => {
        const li = document.createElement('li');
        li.textContent = skill;

        const btn = document.createElement('button');
        btn.className = 'remove-btn';
        btn.textContent = 'x';
        btn.dataset.index = index;

        li.appendChild(btn);
        list.appendChild(li);
    });
}

function addSkill() {
    const value = input.value.trim();
    if(!value) return;
    skills.push(value);
    input.value = '';
    render();
}

addBttn.addEventListener('click', addSkill);
input.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') {
        addSkill();
    }
});

list.addEventListener('click', (e) => {
    if(e.target.classList.contains('remove-btn')) {
        const index = e.target.dataset.index;
        skills.splice(index, 1);
        render();
    }
});

render();
