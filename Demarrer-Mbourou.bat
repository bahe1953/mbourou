@echo off
chcp 65001 >nul
title Mbourou - Gestion de Boulangerie
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js n'est pas installe.
  echo  Installez Node.js 22.13 ou plus recent ^(24 LTS conseille^) puis relancez ce fichier.
  echo  https://nodejs.org  - le fichier d'installation peut etre copie sur cle USB pour un poste sans internet.
  echo.
  pause
  exit /b 1
)
start "" http://localhost:3000
node server.js
pause
